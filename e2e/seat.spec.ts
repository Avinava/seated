import { type Locator, type Page } from '@playwright/test';
import { expect, liveRegion, openSample, seat, seatedFigure, settledBox, test, toast } from './fixtures';

const unseated = (page: Page) => page.getByRole('complementary', { name: 'Unseated guests' });
const party = (page: Page, name: string) =>
  unseated(page).getByRole('button', { name: new RegExp(`^${name}\\s*, \\d+ guests`) });

/** Press, travel in small steps (so the CDK sees a real drag) and release over the target. */
async function drag(page: Page, from: Locator, to: Locator): Promise<void> {
  await from.scrollIntoViewIfNeeded();
  const a = await settledBox(from);
  const b = await settledBox(to);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 6, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 16 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await openSample(page, 'seating');
  await expect(seatedFigure(page)).toHaveText('84/100 seated');
});

test('drags a whole party onto an empty seat with the pointer', async ({ page }) => {
  await drag(page, party(page, 'The Kauls'), seat(page, 't-long-b', 1));

  await expect(seat(page, 't-long-b', 1)).toHaveAccessibleName(/Kaul/);
  await expect(seat(page, 't-long-b', 2)).toHaveAccessibleName(/Kaul/);
  await expect(party(page, 'The Kauls')).toHaveCount(0);
  await expect(seatedFigure(page)).toHaveText('86/100 seated');
  await expect(toast(page)).toContainText('Seated the Kauls at Long B');
});

test('picks up a party and drops it with the keyboard', async ({ page }) => {
  const boses = party(page, 'The Boses');
  await boses.focus();
  await page.keyboard.press('Enter');
  await expect(boses).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/^Holding\s+the Boses/)).toBeVisible();
  await expect(liveRegion(page)).toHaveText('Holding the Boses, 3 guests. Choose a seat. Escape to cancel.');

  // Focus a seat: the preview names what the drop would do, then Enter drops.
  const target = seat(page, 't-long-b', 5);
  await target.focus();
  await expect(target).toHaveAccessibleName(/drop lands here/);
  await page.keyboard.press('Enter');

  for (const n of [5, 6, 7]) await expect(seat(page, 't-long-b', n)).toHaveAccessibleName(/Bose/);
  await expect(liveRegion(page)).toHaveText('Seated the Boses at Long B');
  await expect(seatedFigure(page)).toHaveText('87/100 seated');
});

test('Escape puts a held party back', async ({ page }) => {
  const chawlas = party(page, 'The Chawlas');
  await chawlas.focus();
  await page.keyboard.press('Enter');
  await expect(chawlas).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Escape');
  await expect(chawlas).toHaveAttribute('aria-pressed', 'false');
  await expect(liveRegion(page)).toHaveText('Put the Chawlas back. Nothing moved.');
  await expect(seatedFigure(page)).toHaveText('84/100 seated');
});

test('Delete on a seat unseats its guest', async ({ page }) => {
  const kamla = seat(page, 't-1', 1);
  await expect(kamla).toHaveAccessibleName(/Kamla Mehta/);
  await kamla.focus();
  await page.keyboard.press('Delete');

  await expect(kamla).toHaveAccessibleName(/^Seat 1, empty/);
  await expect(toast(page)).toContainText('Moved Kamla Mehta back to unseated');
  await expect(unseated(page).getByRole('button', { name: /^Kamla Mehta/ })).toBeVisible();
  await expect(seatedFigure(page)).toHaveText('83/100 seated');
});
