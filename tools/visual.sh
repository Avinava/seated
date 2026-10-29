#!/usr/bin/env bash
# Kit visual regression: every Storybook story in light and dark, compared with
# the baselines in e2e/visual/__screenshots__.
#
#   tools/visual.sh            compare against the baselines
#   tools/visual.sh --update   rewrite the baselines (review the diff before committing)
#   tools/visual.sh --build    rebuild storybook-static first
#   other arguments go to `playwright test` (e.g. --grep seating)
#
# Pixels differ between macOS and Linux fonts and rasterisers, so the tests run
# only inside the official Playwright image whose tag matches the installed
# @playwright/test, never on the host. On a machine with Docker this script
# starts that container with the repo mounted and runs the Playwright CLI from
# the mounted node_modules (pure JavaScript, so a macOS install works). When it
# is already inside that image (the CI `visual` job uses it as its container,
# detected by PLAYWRIGHT_BROWSERS_PATH=/ms-playwright), it runs the CLI directly.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

build=0
args=()
for arg in "$@"; do
  case "$arg" in
    --update) args+=(--update-snapshots=all) ;;
    --build) build=1 ;;
    *) args+=("$arg") ;;
  esac
done

version=$(node -p 'require("./node_modules/@playwright/test/package.json").version')
image="mcr.microsoft.com/playwright:v${version}-noble"

if [[ $build == 1 || ! -f storybook-static/index.json ]]; then
  step 'Storybook build'
  pnpm exec ng run kit:build-storybook --quiet
fi

cli=(node node_modules/@playwright/test/cli.js test -c playwright.visual.config.ts)

if [[ "${PLAYWRIGHT_BROWSERS_PATH:-}" == /ms-playwright ]]; then
  step "kit visual tests (in $image)"
  exec "${cli[@]}" "${args[@]+"${args[@]}"}"
fi

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "tools/visual.sh needs Docker (running) to use $image, so screenshots match CI pixel for pixel." >&2
  exit 1
fi

step "kit visual tests (docker $image)"
tty=()
[[ -t 1 ]] && tty=(-t)
# Run as the host user so baselines and reports are not owned by root on Linux.
docker run --rm --ipc=host --init "${tty[@]+"${tty[@]}"}" \
  --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI="${CI:-}" \
  -v "$PWD":/work -w /work \
  "$image" "${cli[@]}" "${args[@]+"${args[@]}"}"
