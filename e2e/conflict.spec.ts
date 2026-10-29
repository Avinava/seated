import { MOD, expect, openSample, seat, test } from './fixtures';

test('a keep-apart conflict clears when one guest moves, and undo brings it back', async ({ page }) => {
  await openSample(page, 'seating');
  const header = page.locator('st-seating-page header');
  const rule = page
    .getByRole('complementary', { name: 'Rules and details' })
    .getByRole('button', { name: /^Keep apart .*Keep Dev Malhotra and Rohan Kapoor apart/ });

  // The sample opens with exactly one conflict: Dev and Rohan, both at T3.
  await expect(header.getByText('1 conflict')).toBeVisible();
  await expect(rule).toContainText('Conflict');
  await expect(rule).toContainText('Both are at T3');
  await expect(seat(page, 't-3', 1)).toHaveAccessibleName('Seat 1, Dev Malhotra, breaks a rule');

  // Pick Rohan up from his seat and drop him at T8, all by keyboard.
  const rohan = seat(page, 't-3', 2);
  await expect(rohan).toHaveAccessibleName('Seat 2, Rohan Kapoor, breaks a rule');
  await rohan.focus();
  await page.keyboard.press('Enter');
  await expect(rohan).toHaveAccessibleName(/being moved/);
  await seat(page, 't-8', 7).focus();
  await page.keyboard.press('Enter');

  await expect(seat(page, 't-8', 7)).toHaveAccessibleName('Seat 7, Rohan Kapoor');
  await expect(rule).toContainText('Met');
  await expect(rule).toContainText('At different tables');
  await expect(header.getByText(/conflict/)).toHaveCount(0);

  // Undo puts Rohan back at T3, and the conflict with him.
  await page.keyboard.press(`${MOD}+z`);
  await expect(seat(page, 't-3', 2)).toHaveAccessibleName('Seat 2, Rohan Kapoor, breaks a rule');
  await expect(rule).toContainText('Both are at T3');
  await expect(header.getByText('1 conflict')).toBeVisible();
});
