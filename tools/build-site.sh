#!/usr/bin/env bash
# Builds the app and the design kit into dist/site for GitHub Pages: the app at
# $BASE and Storybook at ${BASE}kit/. BASE defaults to "/"; use BASE=/seated/
# for a project site.
set -euo pipefail
cd "$(dirname "$0")/.."
base="${BASE:-/}"
out=dist/site

rm -rf "$out"
pnpm exec ng build seated --base-href "$base"
pnpm exec ng run kit:build-storybook --quiet

mkdir -p "$out"
cp -R dist/seated/browser/. "$out/"
cp -R storybook-static "$out/kit"
# Pages has no rewrites: unknown paths fall back to the app shell, which routes them.
cp "$out/index.csr.html" "$out/404.html" 2>/dev/null || cp "$out/index.html" "$out/404.html"
touch "$out/.nojekyll"
echo "Built $out (app at $base, kit at ${base}kit/)."
