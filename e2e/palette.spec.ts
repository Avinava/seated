import { MOD, expect, openSample, seat, test } from './fixtures';

test('Cmd/Ctrl+K finds a guest and jumps to her seat', async ({ page }) => {
  await openSample(page, 'seating');
  await page.keyboard.press(`${MOD}+k`);
  const palette = page.getByRole('dialog', { name: 'Command palette' });
  await expect(palette).toBeVisible();
  const input = palette.getByRole('combobox');
  await expect(input).toBeFocused();

  await input.fill('Kamla');
  await expect(palette.getByRole('option').first()).toContainText('Find Kamla Mehta');
  await page.keyboard.press('Enter');

  await expect(palette).toBeHidden();
  await expect(seat(page, 't-1', 1)).toBeFocused();
  await expect(seat(page, 't-1', 1)).toHaveAccessibleName(/Kamla Mehta/);
  await expect(page.locator('st-table[data-table-id="t-1"] button.top')).toHaveAttribute('aria-pressed', 'true');
});

test('Escape closes the palette and returns focus', async ({ page }) => {
  await openSample(page, 'guests');
  const opener = page.getByRole('button', { name: /Search or jump to/ });
  await opener.click();
  const palette = page.getByRole('dialog', { name: 'Command palette' });
  await expect(palette).toBeVisible();
  await expect(palette.getByRole('combobox')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(palette).toBeHidden();
  await expect(opener).toBeFocused();
});
