#!/usr/bin/env bash
set -euo pipefail
if [[ ${1:-} == --help ]]; then printf 'Usage: bash deploy/backup.sh <private-output-directory>\n'; exit 0; fi
if [[ $# != 1 || $(uname -s) != Linux ]]; then printf 'Backup requires Linux and one output directory.\n' >&2; exit 2; fi
# shellcheck source=deploy/common.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
docker info >/dev/null
umask 077
destination=$(realpath -m -- "$1")
if [[ $destination == "$script_root" || $destination == "$script_root/"* ]]; then
  printf 'Store backups outside the application repository.\n' >&2; exit 1
fi
mkdir -p -- "$destination"
destination=$(realpath -e -- "$destination")
if [[ $destination == "$script_root" || $destination == "$script_root/"* ]]; then exit 1; fi
snapshot_dir=$(mktemp -d "$destination/harmea-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXXXX")
printf 'Snapshot is incomplete.\n' > "$snapshot_dir/INCOMPLETE"
resume=false
finish() {
  local result=$?
  trap - EXIT
  if $resume; then
    if ! start_app; then printf 'Backup finished or failed, but app restart failed.\n' >&2; result=1; fi
  fi
  if (( result != 0 )); then printf 'Backup failed; incomplete output and private diagnostics were retained.\n' >&2; fi
  exit "$result"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
info=$(snapshot_helper prepare)
read -r driver database <<< "$info"
[[ $driver == local || $driver == s3 ]]
app_container=$(compose ps -aq app)
if [[ -n $app_container ]]; then
  # Inspect secrets only through a pipe to the helper; never write or print raw env.
  if ! docker inspect --format '{{json .Config.Env}}' "$app_container" | snapshot_helper validate-live ro; then
    printf 'The configured environment does not match the existing app; backup was not started.\n' >&2
    exit 1
  fi
fi
if app_running; then resume=true; compose stop -t 15 app >&2; fi
# Credentials expand in the DB container, never in the host shell.
# shellcheck disable=SC2016
if ! compose exec -T -e "HARMEA_EXPECTED_DATABASE=$database" db sh -eu -c '
  test "$MYSQL_DATABASE" = "$HARMEA_EXPECTED_DATABASE"
  export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"
  exec mysqldump --user=root --single-transaction --routines --events --triggers --set-gtid-purged=OFF --no-tablespaces -- "$MYSQL_DATABASE"
' > "$snapshot_dir/db.sql" 2> "$snapshot_dir/db-errors.log"; then
  printf 'Database dump failed; inspect private diagnostics.\n' >&2; exit 1
fi
if [[ $driver == local ]]; then snapshot_helper archive; else
  printf 'S3 mode: DB only. Bucket versioning/backups are managed by the operator.\n' >&2
fi
snapshot_helper seal
printf '%s\n' "$snapshot_dir"
