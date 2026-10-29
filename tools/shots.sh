#!/usr/bin/env bash
# Renders the README frames (e2e/shots/frames.ts) into docs/screenshots at 2x,
# then shrinks them with pngquant when it is installed (lossy palette
# quantisation, visually identical for flat UI; files stay plain PNG).
set -euo pipefail
cd "$(dirname "$0")/.."

out=docs/screenshots
mkdir -p "$out"
# A full run starts clean so renamed frames do not linger; a filtered run (-g 2q) keeps the rest.
[[ $# -eq 0 ]] && rm -f "$out"/*.png
SHOTS=1 pnpm exec playwright test --project=shots "$@"

if command -v pngquant >/dev/null 2>&1; then
  pngquant --quality=80-98 --speed 1 --strip --skip-if-larger --force --ext .png "$out"/*.png || true
else
  echo 'pngquant not found: screenshots are left uncompressed (brew install pngquant).'
fi

ls -l "$out" | awk 'NR > 1 { printf "%6d KB  %s\n", $5 / 1024, $9 }'
