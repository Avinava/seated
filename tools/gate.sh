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
pnpm exec tsc -p libs/domain/tsconfig.json
pnpm exec tsc -p tools/tsconfig.json

step 'no raw style in the app (tokens only)'
if rg -n --glob '*.{ts,html,scss,css}' -e '#[0-9a-fA-F]{3,8}\b' -e 'oklch\(' -e 'rgba?\(' -e 'font-family' apps/seated/src; then
  echo 'Raw colours or fonts found in apps/. Use kit tokens.' >&2
  exit 1
fi

step 'domain tests with coverage'
pnpm exec vitest run --config libs/domain/vitest.config.ts --coverage

step 'kit and app unit tests'
pnpm exec ng test kit --watch=false
pnpm exec ng test seated --watch=false

step 'production build with budgets'
pnpm exec ng build seated

echo
echo 'gate passed'
