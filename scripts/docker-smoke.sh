#!/usr/bin/env bash
set -euo pipefail

if [[ ${1:-} == --help ]]; then
  printf 'Usage: bash scripts/docker-smoke.sh [loaded-image-ref]\nRequires Linux, Node 24, Docker Compose, curl. No registry push.\n'
  exit 0
fi
if [[ $# -gt 1 || $(uname -s) != Linux ]]; then
  printf 'Docker smoke requires a Linux host and at most one image argument.\n' >&2
  exit 2
fi
for tool in docker node curl timeout; do command -v "$tool" >/dev/null; done
docker info >/dev/null
image=${1:-harmea-web:test}
repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
umask 077
smoke_dir=$(mktemp -d "${TMPDIR:-/tmp}/harmea-docker-smoke.XXXXXXXX")
project="harmea-smoke-$(node -e "process.stdout.write(require('node:crypto').randomBytes(8).toString('hex'))")"
run_name="$project-standalone"
web_network="$project-web"
network_created=false
compose_prepared=false
standalone_created=false

compose() {
  APP_IMAGE="$image" MYSQL_BUFFER_POOL=128M docker compose \
    --project-directory "$smoke_dir" --env-file "$smoke_dir/.env" --project-name "$project" \
    -f "$smoke_dir/docker-compose.yml" -f "$smoke_dir/override.json" "$@"
}
cleanup() {
  local result=$?
  trap - EXIT
  set +e
  if $standalone_created; then docker rm -f -v "$run_name" >/dev/null 2>&1; fi
  if $compose_prepared; then compose down -v --remove-orphans >/dev/null 2>&1; fi
  if $network_created; then docker network rm "$web_network" >/dev/null 2>&1; fi
  # Only the directory allocated by this invocation can be removed.
  if [[ -n $smoke_dir && $(basename -- "$smoke_dir") == harmea-docker-smoke.* ]]; then
    rm -rf -- "$smoke_dir"
  fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

node --input-type=module - "$repo_root" "$smoke_dir" "$image" "$project" "$web_network" <<'NODE'
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
const [root,dir,image,project,network]=process.argv.slice(2);
const secret=()=>randomBytes(32).toString('hex');
const password=secret();
const values={NODE_ENV:'production',PORT:'3000',APP_URL:'http://127.0.0.1:3000',DATABASE_URL:`mysql://harmea:${password}@db:3306/harmea_smoke`,DB_CONNECTION_LIMIT:'2',MYSQL_DATABASE:'harmea_smoke',MYSQL_USER:'harmea',MYSQL_PASSWORD:password,MYSQL_ROOT_PASSWORD:secret(),MYSQL_BUFFER_POOL:'128M',LOOKUP_SECRET:secret(),UPLOAD_DIR:'/app/storage/uploads',STORAGE_DRIVER:'local',ADMIN_ENABLED:'true'};
const seen=new Set();
const lines=readFileSync(join(root,'.env.example'),'utf8').split(/\r?\n/).map(line=>{
 const match=/^([A-Z_]+)=/.exec(line);
 if(!match)return line;
 const key=match[1];seen.add(key);
 return `${key}=${values[key]??line.slice(key.length+1).replaceAll('CHANGE_ME',secret())}`;
});
for(const [key,value] of Object.entries(values))if(!seen.has(key))lines.push(`${key}=${value}`);
writeFileSync(join(dir,'.env'),lines.join('\n')+'\n',{mode:0o600});
// Resolve env_file relative to this copy; never read the repository's private .env.
writeFileSync(join(dir,'docker-compose.yml'),readFileSync(join(root,'docker-compose.yml')));
writeFileSync(join(dir,'override.json'),JSON.stringify({services:{app:{container_name:`${project}-app`,build:{context:root}}},networks:{web:{name:network}}}));
NODE
compose_prepared=true

printf 'Checking image metadata and runtime contents.\n'
docker image inspect "$image" > "$smoke_dir/image.json"
node --input-type=module - "$smoke_dir/image.json" <<'NODE'
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const [image]=JSON.parse(readFileSync(process.argv[2],'utf8'));
assert.equal(image.Architecture,'amd64');assert.equal(image.Os,'linux');
assert.equal(image.Config.User,'node');assert.ok(image.Config.Healthcheck?.Test?.join(' ').includes('/health'));
assert.deepEqual(image.Config.Cmd,['node','apps/api/dist/server.js']);
assert.ok(image.Config.ExposedPorts['3000/tcp']);
console.log(`Image size: ${image.Size} bytes.`);
NODE
docker run --rm -i --entrypoint node "$image" --input-type=module - <<'NODE'
import assert from 'node:assert/strict';import {existsSync,readdirSync} from 'node:fs';
assert.notEqual(process.getuid(),0);
for(const name of ['.git','.local-admin.txt','tests','docs','tasks'])assert.equal(existsSync(`/app/${name}`),false);
assert.equal(readdirSync('/app').some(name=>name.startsWith('.env')),false);
assert.deepEqual(readdirSync('/app/storage'),[]);
NODE

stop_cleanly() {
  local container=$1 started=$SECONDS
  docker stop --time 12 "$container" >/dev/null
  if (( SECONDS - started >= 15 )); then printf 'SIGTERM exceeded 15 seconds.\n' >&2; return 1; fi
  [[ $(docker inspect --format '{{.State.ExitCode}}' "$container") == 0 ]]
  [[ $(docker inspect --format '{{.State.OOMKilled}}' "$container") == false ]]
}
check_logs() {
  node --input-type=module - "$smoke_dir/.env" "$1" <<'NODE'
import {readFileSync} from 'node:fs';
const env=readFileSync(process.argv[2],'utf8');const logs=readFileSync(process.argv[3],'utf8');
const secrets=['LOOKUP_SECRET','MYSQL_PASSWORD','MYSQL_ROOT_PASSWORD'].map(key=>env.match(new RegExp(`^${key}=(.+)$`,'m'))?.[1]);
for(const value of [...secrets,'0900000000','Docker smoke recipient','Docker smoke address','https://open.spotify.com/track/docker-smoke-fixture'])
 if(value&&logs.includes(value))throw Error('Sensitive data appeared in Docker logs.');
let stopped=false;
for(const line of logs.split(/\r?\n/).filter(Boolean)){
 let entry;try{entry=JSON.parse(line);}catch{throw Error('Container emitted a non-JSON log line.');}
 if(entry.event==='server_stopped')stopped=true;
 if(entry.level==='error')throw Error('Container emitted an error log during smoke.');
}
if(!stopped)throw Error('Missing graceful shutdown log.');
NODE
}

printf 'Checking standalone /health without MySQL and SIGTERM.\n'
standalone_created=true
docker run -d --name "$run_name" -p 127.0.0.1:3000:3000 --env-file "$smoke_dir/.env" "$image" >/dev/null
timeout 30 bash -c 'until curl -fsS --max-time 1 http://127.0.0.1:3000/health >/dev/null 2>&1; do sleep 1; done' || {
  printf 'Standalone /health did not return 200 within 30 seconds.\n' >&2
  exit 1
}
stop_cleanly "$run_name"
docker logs "$run_name" > "$smoke_dir/standalone.log" 2>&1
check_logs "$smoke_dir/standalone.log"
docker rm -v "$run_name" >/dev/null
standalone_created=false

compose config --format json > "$smoke_dir/config.json"
node --input-type=module - "$smoke_dir/config.json" <<'NODE'
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync(process.argv[2],'utf8'));
for(const service of ['app','db'])assert.equal(config.services[service].ports?.length??0,0);
assert.deepEqual(Object.keys(config.services.db.networks),['backend']);
assert.equal(config.networks.backend.internal,true);
assert.equal(config.networks.web.external,true);
NODE
docker network create --label "harmea.smoke=$project" "$web_network" >/dev/null
network_created=true
printf 'Checking Compose, migrations and order/admin/image lifecycle.\n'
compose up -d --no-build --wait --wait-timeout 180
compose run --rm --no-deps app node scripts/migrate.ts
app_id=$(compose ps -q app)
db_id=$(compose ps -q db)
[[ $(docker inspect --format '{{.Image}}' "$app_id") == $(docker image inspect --format '{{.Id}}' "$image") ]]
docker inspect "$db_id" > "$smoke_dir/db.json"
node --input-type=module - "$smoke_dir/db.json" <<'NODE'
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const [db]=JSON.parse(readFileSync(process.argv[2],'utf8'));
assert.equal(Object.keys(db.NetworkSettings.Networks).length,1);
assert.ok(Object.values(db.NetworkSettings.Ports??{}).every(value=>value===null));
NODE
backend_id=$(docker inspect --format '{{range .NetworkSettings.Networks}}{{.NetworkID}}{{end}}' "$db_id")
[[ $(docker network inspect --format '{{.Internal}}' "$backend_id") == true ]]
fixture() {
  compose exec -T -e HARMEA_DOCKER_SMOKE=true app node --input-type=module - "$1" < "$repo_root/scripts/docker-fixture.mjs"
}
fixture create
stop_cleanly "$app_id"
docker logs "$app_id" > "$smoke_dir/compose.log" 2>&1
check_logs "$smoke_dir/compose.log"
compose down
printf 'Checking persistence after down/up without deleting volumes.\n'
compose up -d --no-build --wait --wait-timeout 180
fixture verify
printf 'Checking backup/restore after deleting only the isolated test volumes.\n'
backup_env=(env "HARMEA_STACK_DIR=$smoke_dir" "HARMEA_COMPOSE_PROJECT=$project" "HARMEA_COMPOSE_OVERRIDE=$smoke_dir/override.json" "APP_IMAGE=$image" MYSQL_BUFFER_POOL=128M)
snapshot_path=$("${backup_env[@]}" bash "$repo_root/deploy/backup.sh" "$smoke_dir/backups")
[[ -d $snapshot_path && $snapshot_path == "$smoke_dir/backups/"* ]]
compose down -v
compose up -d --no-build --wait --wait-timeout 180 db
"${backup_env[@]}" bash "$repo_root/deploy/restore.sh" "$snapshot_path" --yes
fixture verify
node --input-type=module - "$smoke_dir/.env" <<'NODE'
import {readFileSync,writeFileSync} from 'node:fs';
const path=process.argv[2];writeFileSync(path,readFileSync(path,'utf8').replace(/^ADMIN_ENABLED=true$/m,'ADMIN_ENABLED=false'),{mode:0o600});
NODE
compose up -d --no-deps --no-build --force-recreate --wait --wait-timeout 90 app
fixture gate
app_id=$(compose ps -q app)
stop_cleanly "$app_id"
docker logs "$app_id" > "$smoke_dir/gate.log" 2>&1
check_logs "$smoke_dir/gate.log"
printf 'Docker smoke: PASS (image, health, SIGTERM, Compose, MySQL, admin gate, private images, volumes, networks).\n'
