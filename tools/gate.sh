#!/usr/bin/env bash
# Everything that must pass before a commit. CI runs exactly this.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

step 'tokens are generated from design/tokens.json'
pnpm exec tsx tools/gen-tokens.ts --check

step 'format'
pnpm exec prettier --check . --log-level warn

step 'lint'
pnpm exec eslint . --max-warnings 0

step 'types'
for project in libs/domain/tsconfig.json libs/kit/tsconfig.lib.json libs/kit/tsconfig.spec.json \
  libs/kit/.storybook/tsconfig.json apps/seated/tsconfig.app.json apps/seated/tsconfig.spec.json tools/tsconfig.json \
  e2e/tsconfig.json; do
  pnpm exec tsc -p "$project" --noEmit
done

# index.html is exempt: theme-color metas need literal colours before any CSS loads.
step 'no raw style in the app (tokens only)'
if rg -n --glob '*.{ts,html,scss,css}' -e '#[0-9a-fA-F]{3,8}\b' -e 'oklch\(' -e 'rgba?\(' -e 'font-family' apps/seated/src --glob '!index.html'; then
  echo 'Raw colours or fonts found in apps/. Use kit tokens.' >&2
  exit 1
fi

step 'domain tests with coverage'
pnpm exec vitest run --config libs/domain/vitest.config.ts --coverage

step 'kit and app unit tests'
pnpm exec ng test kit --watch=false
pnpm exec ng test seated --watch=false

step 'Storybook build, interaction and axe tests'
pnpm exec ng run kit:build-storybook --quiet
pnpm exec http-server storybook-static -a 127.0.0.1 -p 6006 -s &
server=$!
trap 'kill $server 2>/dev/null || true' EXIT
pnpm exec wait-on -t 30000 http-get://127.0.0.1:6006/index.json
pnpm run test-storybook --maxWorkers=4
kill $server 2>/dev/null || true
wait $server 2>/dev/null || true
trap - EXIT

step 'production build with budgets'
pnpm exec ng build seated

# Playwright starts and stops its own static server (playwright.config.ts webServer).
step 'e2e flows and axe on every route'
pnpm exec playwright test --project=flows

# Baselines come from the pinned Playwright image, so this needs Docker. CI runs it
# in a separate job inside that image and sets SKIP_VISUAL=1 here.
step 'kit visual regression (Docker)'
if [[ -n "${SKIP_VISUAL:-}" ]]; then
  echo 'skipped: SKIP_VISUAL is set (CI runs it in the visual job)'
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  tools/visual.sh
elif [[ -n "${CI:-}" ]]; then
  echo 'Docker is required for the kit visual tests in CI.' >&2
  exit 1
else
  echo 'SKIPPED: Docker is not running, so the kit visual tests did not run. Start Docker and run `mise run visual`.'
fi

# Lighthouse starts and stops its own server (lighthouserc.json startServerCommand).
step 'Lighthouse scores and budgets'
LH_SKIP_BUILD=1 pnpm exec tsx tools/lighthouse.ts

echo
echo 'gate passed'
