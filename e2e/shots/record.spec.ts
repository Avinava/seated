import { type Locator, type Page } from '@playwright/test';
import { MOD, expect, seat, seatedFigure, settledBox, test } from '../fixtures';
import { settle } from './frames';

/**
 * The README screen recording: drag a party onto a seat, see the conflict,
 * fix it from the keyboard, auto-seat, undo, redo. Playwright records the
 * video (project `record`, 1280x800); tools/record.sh turns it into
 * docs/media/seating.mp4 and seating.gif. The pauses are pacing for people
 * watching, not waits for the app: every step still asserts its outcome.
 */
const RAW = 'test-results/record/seating.webm';

test.use({ reducedMotion: 'no-preference' });

/** Headless video has no cursor, so draw one that follows the mouse. */
const CURSOR = `
  addEventListener('DOMContentLoaded', () => {
    const dot = document.createElement('div');
    dot.setAttribute('aria-hidden', 'true');
    dot.style.cssText = 'position:fixed;z-index:2147483647;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;' +
      'background:rgba(20,20,20,.35);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);pointer-events:none;' +
      'left:-40px;top:-40px;transition:transform .12s';
    document.body.appendChild(dot);
    addEventListener('pointermove', (e) => { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; }, true);
    addEventListener('pointerdown', () => (dot.style.transform = 'scale(.75)'), true);
    addEventListener('pointerup', () => (dot.style.transform = ''), true);
  });
`;

async function glide(page: Page, to: Locator, steps = 30): Promise<void> {
  const b = await settledBox(to);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps });
}

test('seating, start to finish @shots', async ({ page }) => {
  await page.addInitScript(CURSOR);
  await page.goto('/events/ev-wedding/seating');
  await settle(page);
  await page.mouse.move(640, 300);
  await page.waitForTimeout(900);

  // 1. Drag the Kauls from the unseated list onto Long B.
  const kauls = page
    .getByRole('complementary', { name: 'Unseated guests' })
    .getByRole('button', { name: /^The Kauls\s*, 2 guests/ });
  await kauls.scrollIntoViewIfNeeded();
  await glide(page, kauls, 20);
  await page.mouse.down();
  await page.mouse.move(...(await nudge(kauls)), { steps: 4 });
  await glide(page, seat(page, 't-long-b', 1), 40);
  await page.mouse.up();
  await expect(seat(page, 't-long-b', 1)).toHaveAccessibleName(/Kaul/);
  await page.waitForTimeout(1200);

  // 2. The conflict: open the rules (a drawer at this width) and read it.
  await glide(page, page.getByRole('button', { name: /^Rules/ }), 20);
  await page.getByRole('button', { name: /^Rules/ }).click();
  const rule = page.getByRole('dialog').getByRole('button', { name: /^Keep apart .*Rohan Kapoor apart/ });
  await expect(rule).toContainText('Both are at T3');
  await page.waitForTimeout(1600);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.mouse.move(1270, 790, { steps: 10 });

  // 3. Fix it from the keyboard: pick Rohan up, move him to T8.
  await seat(page, 't-3', 2).focus();
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  for (const n of [2, 3, 4, 5, 6, 7]) {
    await seat(page, 't-8', n).focus();
    await page.waitForTimeout(n === 7 ? 500 : 160);
  }
  await page.keyboard.press('Enter');
  await expect(page.locator('st-seating-page header').getByText(/conflict/)).toHaveCount(0);
  await page.waitForTimeout(1200);

  // 4. Auto-seat the rest; the summary opens in the drawer.
  const auto = page.locator('st-seating-page header').getByRole('button', { name: 'Auto-seat' });
  await glide(page, auto, 25);
  await auto.click();
  await expect(seatedFigure(page)).toHaveText('100/100 seated');
  await page.waitForTimeout(2000);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  // 5. Undo, then redo, from the keyboard.
  await page.keyboard.press(`${MOD}+z`);
  await expect(seatedFigure(page)).toHaveText('86/100 seated');
  await page.waitForTimeout(1300);
  await page.keyboard.press(`Shift+${MOD}+z`);
  await expect(seatedFigure(page)).toHaveText('100/100 seated');
  await page.waitForTimeout(1500);

  const video = page.video();
  await page.close();
  await video?.saveAs(RAW);
});

async function nudge(locator: Locator): Promise<[number, number]> {
  const b = await settledBox(locator);
  return [b.x + b.width / 2 + 14, b.y + b.height / 2 + 8];
}
