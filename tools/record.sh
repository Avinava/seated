#!/usr/bin/env bash
# Records the README screen capture: Playwright plays e2e/shots/record.spec.ts
# at 1280x800, then ffmpeg turns the WebM into docs/media/seating.mp4 (H.264)
# and img2webp packs ffmpeg's frames into docs/media/seating.webp (animated,
# 960px, 12 fps, lossy q72: under 1 MB). docs/media/README.md has the details.
set -euo pipefail
cd "$(dirname "$0")/.."

for tool in ffmpeg img2webp; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "record.sh needs ffmpeg and img2webp. Install them (brew install ffmpeg webp, apt-get install ffmpeg webp) and run again." >&2
    exit 1
  fi
done

raw=test-results/record/seating.webm
out=docs/media
rm -f "$raw"
SHOTS=1 pnpm exec playwright test --project=record
[[ -f "$raw" ]] || { echo "No recording at $raw" >&2; exit 1; }
mkdir -p "$out"

# Trim the blank first frames before the page paints.
start=0.4

ffmpeg -hide_banner -loglevel error -y -ss "$start" -i "$raw" \
  -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart -an \
  "$out/seating.mp4"

# Animated WebP for the README: GitHub plays it inline and it stays under 1 MB.
# ffmpeg cuts frames, img2webp packs them.
frames=$(mktemp -d)
trap 'rm -rf "$frames"' EXIT
ffmpeg -hide_banner -loglevel error -y -ss "$start" -i "$raw" \
  -vf "fps=12,scale=960:-1:flags=lanczos" "$frames/f%04d.png"
img2webp -loop 0 -lossy -q 72 -m 6 -d 83 -min_size "$frames"/f*.png -o "$out/seating.webp" >/dev/null

for f in "$out/seating.mp4" "$out/seating.webp"; do
  printf '%s  %s KB\n' "$f" "$(( $(wc -c <"$f") / 1024 ))"
done
