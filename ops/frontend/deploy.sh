#!/usr/bin/env bash
set -euo pipefail

# This script is installed on the VPS as a forced SSH command.
case "${1:-}" in
  dev)
    repository=registry.hemia.cloud/medsync/qa-front
    public_origin=https://test.medsync.mx
    ;;
  prod)
    repository=registry.hemia.cloud/medsync/prod-front
    public_origin=https://app.medsync.mx
    ;;
  *) exit 2 ;;
esac
project="${2:?Existing Compose project required}"
directory="${3:?Existing Compose directory required}"
request="${SSH_ORIGINAL_COMMAND:-}"
if [[ ! "$request" =~ ^deploy\ (sha256:[a-f0-9]{64})\ ([a-f0-9]{40}-[0-9]+-[0-9]+)$ ]]; then
  echo 'Expected deploy <digest> <release>.' >&2
  exit 2
fi
image="$repository@${BASH_REMATCH[1]}"
release="${BASH_REMATCH[2]}"
cd "$directory"
exec 9>deploy.lock
flock -w 30 9
export DOCKER_HOST=unix:///var/run/docker.sock
compose=(docker compose -p "$project" -f compose.yml)
origin=http://127.0.0.1:4324
umask 077
scratch="$(mktemp -d .frontend-deploy.XXXXXX)"
trap 'rm -rf -- "$scratch"' EXIT

verify() {
  local base="$1" marker expected asset
  local query="?release=$release"
  local fetch=(curl -fsS --max-time 10 -H 'Cache-Control: no-cache')
  marker="$("${fetch[@]}" "$base/deploy-release.json$query")" || return 1
  expected="$(jq -er --arg release "$release" '
    select(.application == "medsync-front-legacy" and .release == $release)
    | .indexSha256 | select(test("^[a-f0-9]{64}$"))' <<<"$marker")" || return 1
  "${fetch[@]}" "$base/auth/login$query" -o "$scratch/index.html" || return 1
  [[ "$(sha256sum "$scratch/index.html" | cut -d ' ' -f1)" == "$expected" ]] || return 1
  asset="$(grep -oE '/js/app[.][a-f0-9]{8}[.]js' "$scratch/index.html" | sed -n '1p')" || return 1
  [[ -n "$asset" ]] || return 1
  "${fetch[@]}" "$base$asset" -o /dev/null || return 1
  [[ "$("${fetch[@]}" "$base/deploy-release.json$query")" == "$marker" ]]
}

previous_container="$(MEDSYNC_FRONT_IMAGE="$image" "${compose[@]}" ps --all -q web)"
previous_image="$(docker inspect --format '{{.Config.Image}}' "$previous_container")"
if [[ "${previous_image%@*}" != "$repository" || ! "${previous_image##*@}" =~ ^sha256:[a-f0-9]{64}$ ]]; then
  echo 'The current Compose service must be pinned to a digest for rollback.' >&2
  exit 1
fi

# Preserve the active digest across future Compose restarts.
if [[ -f .env ]]; then
  sed '/^[[:space:]]*MEDSYNC_FRONT_IMAGE=/d' .env > "$scratch/env"
fi
printf 'MEDSYNC_FRONT_IMAGE=%s\n' "$image" >> "$scratch/env"

docker pull "$image"
if MEDSYNC_FRONT_IMAGE="$image" "${compose[@]}" up -d --wait --wait-timeout 60 &&
    verify "$origin"; then
  for attempt in 1 2 3 4; do
    if verify "$public_origin" && mv "$scratch/env" .env; then
      printf 'Active frontend: %s (%s)\n' "$image" "$release"
      exit 0
    fi
    sleep 2
  done
fi

echo "Frontend verification failed. Restoring $previous_image." >&2
MEDSYNC_FRONT_IMAGE="$previous_image" "${compose[@]}" up -d --wait --wait-timeout 60
exit 1
