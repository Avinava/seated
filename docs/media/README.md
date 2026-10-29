# Media

| File          | What                                                      |
| ------------- | --------------------------------------------------------- |
| `seating.mp4` | The README screen recording, H.264, 1280 x 800, about 16s |
| `seating.gif` | The same clip as a GIF, 880px wide at 12 fps, under 4 MB  |

The clip shows the seating screen end to end: drag the Kauls onto Long B, open the rules to see the Dev and Rohan conflict, move Rohan to T8 from the keyboard, run auto-seat, then undo and redo.

## Re-record

```sh
mise run record
```

That runs `tools/record.sh`, which needs `ffmpeg` on the PATH (`brew install ffmpeg`). It:

1. Builds the app and plays `e2e/shots/record.spec.ts` in Playwright with video on (project `record`, enabled by `SHOTS=1`). The spec draws a cursor dot, since headless video has none, and asserts every step, so a broken flow fails instead of recording nonsense.
2. Encodes `test-results/record/seating.webm` to `seating.mp4` (x264, CRF 26, faststart) and `seating.gif` (one 64-colour palette for the clip, ordered dither, only changed rectangles per frame).

The clock is fixed and the data is the seeded sample, so a re-record differs only in timing. To change the story, edit the spec; to change size or quality, edit the ffmpeg lines in `tools/record.sh`.
