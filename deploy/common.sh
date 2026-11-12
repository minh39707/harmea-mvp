#!/usr/bin/env bash
# Sourced by the application backup/restore entry points.
deploy_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
script_root=$(cd -- "$deploy_dir/.." && pwd -P)
stack_dir=$(cd -- "${HARMEA_STACK_DIR:-$script_root}" && pwd -P)
[[ -f "$stack_dir/.env" && -f "$stack_dir/docker-compose.yml" ]] || {
  printf 'A private .env and docker-compose.yml are required in the stack directory.\n' >&2
  exit 1
}
compose_args=(--project-directory "$stack_dir" --env-file "$stack_dir/.env" -f "$stack_dir/docker-compose.yml")
if [[ -n ${HARMEA_COMPOSE_PROJECT:-} ]]; then compose_args+=(--project-name "$HARMEA_COMPOSE_PROJECT"); fi
if [[ -n ${HARMEA_COMPOSE_OVERRIDE:-} ]]; then compose_args+=(-f "$(realpath -e -- "$HARMEA_COMPOSE_OVERRIDE")"); fi
compose() { docker compose "${compose_args[@]}" "$@"; }
snapshot_dir=''
snapshot_helper() {
  local mode=$1 access=${2:-rw}
  compose run --rm --no-deps --pull never -T --user 0 \
    -e HARMEA_BACKUP_HELPER=true -e "HARMEA_BACKUP_UID=$(id -u)" -e "HARMEA_BACKUP_GID=$(id -g)" \
    --volume "$snapshot_dir:/backup:$access" --volume "$deploy_dir/snapshot.mjs:/snapshot-helper.mjs:ro" \
    --entrypoint node app /snapshot-helper.mjs "$mode"
}
app_running() {
  local container
  container=$(compose ps -aq app)
  [[ -n $container && $(docker inspect --format '{{.State.Running}}' "$container") == true ]]
}
start_app() { compose up -d --no-deps --no-build --pull never --wait --wait-timeout 120 app >&2; }
