import { expect, openSample, test, toast } from './fixtures';

test('the RSVP filter lives in the URL and survives a reload', async ({ page }) => {
  await openSample(page, 'guests');
  const rsvp = page.getByRole('radiogroup', { name: 'RSVP' });
  const awaiting = rsvp.getByRole('radio', { name: /^Awaiting/ });
  await expect(rsvp.getByRole('radio', { name: /^All/ })).toHaveAttribute('aria-checked', 'true');

  await awaiting.click();
  await expect(page).toHaveURL(/[?&]rsvp=pending(&|$)/);
  await expect(awaiting).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('12 of 120 shown')).toBeVisible();

  await page.reload();
  await expect(awaiting).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('12 of 120 shown')).toBeVisible();
  const grid = page.getByRole('grid', { name: 'Guests' });
  for (const row of await grid
    .getByRole('row')
    .filter({ has: page.getByRole('gridcell') })
    .all()) {
    await expect(row).toContainText('Awaiting');
  }
});

test('edits a guest from the keyboard, with the meal cross-field check', async ({ page }) => {
  await openSample(page, 'guests');
  const grid = page.getByRole('grid', { name: 'Guests' });
  await grid.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/[?&]guest=/);

  const panel = page.getByRole('dialog');
  await expect(panel).toBeVisible();
  const name = await panel.getByRole('textbox', { name: /^Full name/ }).inputValue();
  expect(name).not.toBe('');
  await expect(panel.getByRole('heading', { name })).toBeVisible();

  // "Other" needs a dietary note: saving without one shows the error on the field.
  await panel.getByRole('combobox', { name: 'Meal' }).selectOption({ label: 'Other' });
  const dietary = panel.getByRole('textbox', { name: /^Dietary needs/ });
  await dietary.fill('');
  await panel.getByRole('button', { name: 'Save' }).click();
  await expect(panel.getByText('Say what "Other" means for the kitchen')).toBeVisible();
  await expect(dietary).toHaveAttribute('aria-invalid', 'true');
  await expect(panel).toBeVisible();

  // Fix it and save: the panel closes and the toast offers Undo.
  await dietary.fill('No onion or garlic');
  await expect(panel.getByText('Say what "Other" means for the kitchen')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Save' }).click();
  await expect(panel).toBeHidden();
  await expect(page).not.toHaveURL(/[?&]guest=/);
  await expect(toast(page)).toContainText(`Saved ${name}`);
  await expect(toast(page).getByRole('button', { name: 'Undo' })).toBeVisible();
  await expect(grid.getByRole('row', { name: new RegExp(name) })).toContainText('Other');
});
