import { expect, openSample, test } from './fixtures';

test('place cards print without the app chrome', async ({ page }) => {
  await openSample(page, 'print');
  const cards = page.locator('st-place-cards').getByRole('listitem');
  await expect(cards).toHaveCount(84);
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();

  await page.emulateMedia({ media: 'print' });

  // Navigation, toolbar and buttons are screen-only; the cards are what prints.
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Print' })).toBeHidden();
  await expect(page.getByRole('radiogroup', { name: 'What to print' })).toBeHidden();
  await expect(cards.first()).toBeVisible();
  await expect(cards.filter({ hasText: 'Kamla Mehta' })).toContainText('T1 · Seat 1');
  await expect(cards).toHaveCount(84);
});
