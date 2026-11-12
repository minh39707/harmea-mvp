#!/usr/bin/env bash
# Exercise deployment decisions with a fake Docker command; never contacts a daemon.
set -euo pipefail
repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
fixture=$(mktemp -d)
trap 'rm -rf -- "$fixture"' EXIT
mkdir -p "$fixture/bin" "$fixture/stack"
printf 'services: {}\n' > "$fixture/stack/docker-compose.yml"
old_image="example/harmea-web@sha256:$(printf 'a%.0s' {1..64})"
new_image="example/harmea-web@sha256:$(printf 'b%.0s' {1..64})"
export DEPLOY_TEST_LOG="$fixture/calls"
cat > "$fixture/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$DEPLOY_TEST_LOG"
if [[ $1 == pull ]]; then exit 0; fi
while [[ $# -gt 0 && $1 != run && $1 != up && $1 != stop ]]; do shift; done
case ${1:-} in
  run)
    case $DEPLOY_TEST_CASE in
      partial) printf 'DDL committed before the runner could print an Applied marker.\n'; exit 1 ;;
      changed) printf 'Applied: 008_customer_payment_reports.sql\n' ;;
      *) printf 'Already applied: 008_customer_payment_reports.sql\n' ;;
    esac ;;
  up)
    if [[ ${*: -1} == app && $DEPLOY_TEST_CASE != success ]]; then
      # Fail the new image, allow a previous-image restart.
      if grep -q '^APP_IMAGE=.*bbbbbbbb' "$DEPLOY_TEST_ENV"; then exit 1; fi
    fi ;;
esac
MOCK
chmod +x "$fixture/bin/docker"
export PATH="$fixture/bin:$PATH"
export DEPLOY_TEST_ENV="$fixture/stack/.env"
for scenario in partial changed unchanged success; do
  export DEPLOY_TEST_CASE=$scenario
  printf 'APP_IMAGE=%s\n' "$old_image" > "$DEPLOY_TEST_ENV"
  : > "$DEPLOY_TEST_LOG"
  result=0
  bash "$repo_dir/deploy/remote-deploy.sh" "$fixture/stack" "$new_image" > "$fixture/output" 2>&1 || result=$?
  case $scenario in
    partial)
      [[ $result -ne 0 ]]
      ! grep -q -- '--wait-timeout 180 app' "$DEPLOY_TEST_LOG"
      grep -q 'schema may be partially changed' "$fixture/output" ;;
    changed)
      [[ $result -ne 0 ]]
      [[ $(grep -c -- '--wait-timeout 180 app' "$DEPLOY_TEST_LOG") == 1 ]]
      grep -q "^APP_IMAGE=$new_image$" "$DEPLOY_TEST_ENV" ;;
    unchanged)
      [[ $result -ne 0 ]]
      [[ $(grep -c -- '--wait-timeout 180 app' "$DEPLOY_TEST_LOG") == 2 ]]
      grep -q "^APP_IMAGE=$old_image$" "$DEPLOY_TEST_ENV" ;;
    success)
      [[ $result == 0 ]]
      grep -q "^APP_IMAGE=$new_image$" "$DEPLOY_TEST_ENV" ;;
  esac
  printf 'PASS: remote deploy %s\n' "$scenario"
done
