#!/usr/bin/env bash
# Runs on the production host, streamed over SSH by .github/workflows/deploy.yml:
#   ssh host 'bash -s -- <stack-dir> <repo>@sha256:<digest>' < deploy/remote-deploy.sh
# Pulls the tested image, points APP_IMAGE at it, migrates with the app stopped and waits for /ready.
# No backup is taken (chosen by the project owner). Automatic rollback to the previous image happens
# only after a successful migration run with no changes; migration errors require manual repair.
set -euo pipefail
umask 077

if [[ $# -ne 2 ]]; then
  printf 'Usage: bash remote-deploy.sh <stack-dir> <repo>@sha256:<digest>\n' >&2
  exit 2
fi
stack_dir=$1
image=$2
if [[ ! $image =~ ^[a-z0-9][a-z0-9._/-]*/harmea-web@sha256:[0-9a-f]{64}$ ]]; then
  printf 'Refusing image reference that is not <repo>/harmea-web@sha256:<digest>.\n' >&2
  exit 2
fi
stack_dir=$(cd -- "$stack_dir" && pwd -P)
env_file="$stack_dir/.env"
[[ -f $env_file && -f $stack_dir/docker-compose.yml ]] || {
  printf 'A private .env and docker-compose.yml are required in the stack directory.\n' >&2
  exit 1
}
unset APP_IMAGE

compose_args=(--project-directory "$stack_dir" --env-file "$env_file" -f "$stack_dir/docker-compose.yml")
if [[ -n ${HARMEA_COMPOSE_PROJECT:-} ]]; then compose_args+=(--project-name "$HARMEA_COMPOSE_PROJECT"); fi
compose() { docker compose "${compose_args[@]}" "$@"; }

if command -v flock >/dev/null; then
  exec 9>"$stack_dir/.deploy.lock"
  flock -w 600 9 || {
    printf 'Another deployment holds the lock.\n' >&2
    exit 1
  }
fi

current_image() { sed -n 's/^APP_IMAGE=//p' "$env_file" | tail -n 1; }
set_image() {
  local tmp
  tmp=$(mktemp "$stack_dir/.env.deploy.XXXXXX")
  awk -v img="$1" '
    /^APP_IMAGE=/ { if (!done) { print "APP_IMAGE=" img; done = 1 } next }
    { print }
    END { if (!done) print "APP_IMAGE=" img }
  ' "$env_file" >"$tmp"
  chmod 600 "$tmp"
  mv -f -- "$tmp" "$env_file"
}
start_app() { compose up -d --no-deps --no-build --pull never --wait --wait-timeout 180 app; }
rollback() {
  if [[ -z $previous ]]; then
    printf 'No previous APP_IMAGE recorded; app left stopped.\n' >&2
    return
  fi
  printf 'Rolling back to the previous image.\n' >&2
  set_image "$previous"
  if start_app; then printf 'Previous image is ready again.\n' >&2; else printf 'Rollback failed; app needs manual repair.\n' >&2; fi
}

previous=$(current_image)
printf 'Pulling %s\n' "$image"
docker pull --quiet "$image" >/dev/null

if [[ $previous == "$image" ]]; then
  printf 'Image already deployed; ensuring the app is up.\n'
  compose up -d --wait db
  start_app
  exit 0
fi

set_image "$image"
compose up -d --wait db
compose stop app

migrate_log=$(mktemp)
trap 'rm -f -- "$migrate_log"' EXIT
if ! compose run --rm --no-deps --pull never -T app node scripts/migrate.ts 2>&1 | tee "$migrate_log"; then
  # MySQL can commit DDL before the runner records "Applied:". Absence of that
  # line cannot prove that the schema is unchanged, so never restart the old app.
  printf 'Migration failed; schema may be partially changed. App left stopped for manual repair or restore from the pre-deploy backup.\n' >&2
  exit 1
fi

if ! start_app; then
  printf 'New image did not become ready.\n' >&2
  if grep -q '^Applied:' "$migrate_log"; then
    printf 'Migrations were applied in this run; not rolling back automatically.\n' >&2
  else
    rollback
  fi
  exit 1
fi
printf 'Deployed %s\n' "$image"
