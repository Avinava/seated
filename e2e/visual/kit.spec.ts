import { existsSync, readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * One screenshot per kit story and theme, with reduced motion, against the
 * static Storybook build. Stories tagged `no-visual` are skipped (each such
 * tag carries a comment in its stories file saying why).
 *
 * Play functions run as the story loads, so a story's final state (an open
 * dialog, a picked-up seat) is what gets compared. Overlay stories render
 * outside #storybook-root, so they are shot at viewport size; everything else
 * is cropped to the story root.
 */

interface IndexEntry {
  readonly id: string;
  readonly title: string;
  readonly name: string;
  readonly type: 'story' | 'docs';
  readonly tags?: readonly string[];
}

const INDEX = 'storybook-static/index.json';
const THEMES = ['light', 'dark'] as const;

function stories(): IndexEntry[] {
  if (!existsSync(INDEX)) {
    throw new Error(`${INDEX} is missing. Build Storybook first: pnpm exec ng run kit:build-storybook`);
  }
  const index = JSON.parse(readFileSync(INDEX, 'utf8')) as { entries: Record<string, IndexEntry> };
  return Object.values(index.entries).filter((e) => e.type === 'story' && !e.tags?.includes('no-visual'));
}

/** Wait until Storybook has rendered the story and finished its play function. */
async function storySettled(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const preview = (window as { __STORYBOOK_PREVIEW__?: { currentRender?: { phase?: string } } })
      .__STORYBOOK_PREVIEW__;
    const phase = preview?.currentRender?.phase;
    if (phase === 'errored') throw new Error('The story failed to render');
    // 'finished' follows 'completed' once the play function and after-each hooks are done.
    return phase === 'finished';
  });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  // Let signals flush and any reduced-motion transitions land.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

for (const story of stories()) {
  const overlay = story.title.startsWith('Overlay/');

  test.describe(`${story.title} / ${story.name}`, () => {
    for (const theme of THEMES) {
      test(theme, async ({ page }) => {
        await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme};motion:reduce`);
        await storySettled(page);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        const name = `${story.id}--${theme}.png`;
        if (overlay) {
          await expect(page).toHaveScreenshot(name);
        } else {
          await expect(page.locator('#storybook-root')).toHaveScreenshot(name);
        }
      });
    }
  });
}
