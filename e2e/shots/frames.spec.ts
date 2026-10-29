import { type Page } from '@playwright/test';
import { NOW, expect, test } from '../fixtures';
import { FRAMES, HERO, SOCIAL, holdParty, settle, shareLink, type Frame } from './frames';

/**
 * Renders the README frames into docs/screenshots. Run with `mise run shots`
 * (SHOTS=1 enables the project; see playwright.config.ts).
 */
const OUT = 'docs/screenshots';

async function open(page: Page, frame: Pick<Frame, 'route' | 'theme' | 'viewport' | 'motion'>): Promise<void> {
  await page.setViewportSize(frame.viewport);
  await page.emulateMedia({ colorScheme: frame.theme, reducedMotion: frame.motion ?? 'reduce' });
  await page.goto(frame.route === 'share-link' ? await shareLink(page) : frame.route);
  await settle(page);
}

async function shoot(page: Page, file: string, motion = false): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.screenshot({ path: `${OUT}/${file}`, caret: 'hide', animations: motion ? 'allow' : 'disabled' });
}

for (const frame of FRAMES) {
  test(`${frame.id} ${frame.name} (${frame.theme}) @shots`, async ({ page }) => {
    await open(page, frame);
    await frame.setup?.(page);
    await shoot(page, `${frame.id}_${frame.name}_${frame.theme}.png`, frame.motion === 'no-preference');
  });
}

test('hero: seating with a party in hand @shots', async ({ page }) => {
  await open(page, { route: '/events/ev-wedding/seating', theme: 'light', viewport: HERO });
  await holdParty(page, 'The Boses', 't-long-b', 2);
  await shoot(page, 'hero.png');
});

test('social preview, 1280x640 at 1x @shots', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: SOCIAL,
    deviceScaleFactor: 1,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
    colorScheme: 'light',
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(NOW);
  await page.goto('/events/ev-wedding/seating');
  await settle(page);
  await holdParty(page, 'The Boses', 't-long-b', 2);
  await shoot(page, 'social_preview.png');
  expect(await page.evaluate(() => [innerWidth, innerHeight])).toEqual([SOCIAL.width, SOCIAL.height]);
  await context.close();
});
