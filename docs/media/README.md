# Media

| File           | What                                                                          |
| -------------- | ----------------------------------------------------------------------------- |
| `seating.mp4`  | The README screen recording, H.264, 1280 x 800, about 16s                     |
| `seating.webp` | The same clip as an animated WebP for the README, 960px at 12 fps, under 1 MB |

The clip shows the seating screen end to end: drag the Kauls onto Long B, open the rules to see the Dev and Rohan conflict, move Rohan to T8 from the keyboard, run auto-seat, then undo and redo.

## Re-record

```sh
mise run record
```

That runs `tools/record.sh`, which needs `ffmpeg` and `img2webp` on the PATH (`brew install ffmpeg webp`). It:

1. Plays `e2e/shots/record.spec.ts` in Playwright with video on (project `record`, enabled by `SHOTS=1`); Playwright's web server builds the app first. The spec draws a cursor dot, since headless video has none, and asserts every step, so a broken flow fails instead of recording nonsense.
2. Encodes `test-results/record/seating.webm` to `seating.mp4` (x264, CRF 26, faststart) and `seating.webp` (frames cut by ffmpeg, packed by `img2webp` at lossy quality 72). GitHub plays an animated WebP inline in the README, and at this quality the clip stays under 1 MB.

The clock is fixed and the data is the seeded sample, so a re-record differs only in timing. To change the story, edit the spec; to change size or quality, edit the ffmpeg and img2webp lines in `tools/record.sh`.
