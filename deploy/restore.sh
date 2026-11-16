#!/usr/bin/env bash
set -euo pipefail
if [[ ${1:-} == --help ]]; then printf 'Usage: bash deploy/restore.sh <snapshot-directory> --yes\n'; exit 0; fi
if [[ $# != 2 || ${2:-} != --yes || $(uname -s) != Linux ]]; then
  printf 'Restore requires Linux, a snapshot directory and explicit --yes.\n' >&2; exit 2
fi
# shellcheck source=deploy/common.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
docker info >/dev/null
umask 077
snapshot_dir=$(realpath -e -- "$1")
[[ -d $snapshot_dir ]]
work_dir=$(mktemp -d "${TMPDIR:-/tmp}/harmea-restore.XXXXXXXX")
restore_started=false
finish() {
  local result=$?
  trap - EXIT
  if (( result != 0 )); then
    if $restore_started; then
      if compose stop -t 15 app >/dev/null 2>&1; then
        printf 'Restore failed; app stopped. Private diagnostics: %s\n' "$work_dir" >&2
      else
        printf 'Restore failed and app stop also failed; inspect the stack. Private diagnostics: %s\n' "$work_dir" >&2
      fi
    else
      printf 'Restore preparation failed before DB/files replacement; inspect application state.\n' >&2
    fi
  elif [[ $(basename -- "$work_dir") == harmea-restore.* ]]; then rm -rf -- "$work_dir"; fi
  exit "$result"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
# Verify all checksums, paths, lookup-secret fingerprint and storage mode before stopping app.
info=$(snapshot_helper validate ro)
read -r driver database <<< "$info"
[[ $driver == local || $driver == s3 ]]
compose up -d --no-deps --no-build --pull never --wait --wait-timeout 180 db >&2
compose stop -t 15 app >&2
restore_started=true
# Credentials expand in the DB container, never in the host shell.
# shellcheck disable=SC2016
if ! compose exec -T -e "HARMEA_EXPECTED_DATABASE=$database" db sh -eu -c '
  test "$MYSQL_DATABASE" = "$HARMEA_EXPECTED_DATABASE"
  case "$MYSQL_DATABASE" in ""|mysql|sys|information_schema|performance_schema|*[!a-zA-Z0-9_]*) exit 1;; esac
  export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"
  printf "DROP DATABASE IF EXISTS \140%s\140; CREATE DATABASE \140%s\140 CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;\n" "$MYSQL_DATABASE" "$MYSQL_DATABASE" | mysql --user=root --binary-mode
  exec mysql --user=root --binary-mode --database="$MYSQL_DATABASE"
' < "$snapshot_dir/db.sql" > "$work_dir/db-stdout.log" 2> "$work_dir/db-errors.log"; then
  printf 'Database restore failed; inspect private diagnostics.\n' >&2; exit 1
fi
if [[ $driver == local ]]; then snapshot_helper restore-files ro; else
  printf 'S3 mode: DB only. Bucket versioning/backups are managed by the operator.\n' >&2
fi
if ! compose run --rm --no-deps --pull never -T app node scripts/migrate.ts > "$work_dir/migrate.log" 2>&1; then
  printf 'Migration failed; app stays stopped. Inspect private diagnostics.\n' >&2; exit 1
fi
start_app
printf 'Restore complete; app is ready.\n'
