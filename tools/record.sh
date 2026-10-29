#!/usr/bin/env bash
# Records the README screen capture: Playwright plays e2e/shots/record.spec.ts
# at 1280x800, then ffmpeg turns the WebM into docs/media/seating.mp4 (H.264)
# and docs/media/seating.gif (880px, 12 fps, one 64-colour palette for the
# clip, ordered dither, only changed rectangles per frame: about 4 MB).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo 'record.sh needs ffmpeg to encode the MP4 and GIF. Install it (brew install ffmpeg, apt-get install ffmpeg) and run again.' >&2
  exit 1
fi

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

ffmpeg -hide_banner -loglevel error -y -ss "$start" -i "$raw" \
  -filter_complex "fps=12,scale=880:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
  "$out/seating.gif"

for f in "$out/seating.mp4" "$out/seating.gif"; do
  printf '%s  %s KB\n' "$f" "$(( $(wc -c <"$f") / 1024 ))"
done
