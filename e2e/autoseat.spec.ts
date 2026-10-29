import { MOD, expect, openSample, seatedFigure, test, toast } from './fixtures';

test('auto-seat explains itself, and undo and redo work from the toast and the keyboard', async ({ page }) => {
  await openSample(page, 'seating');
  await expect(seatedFigure(page)).toHaveText('84/100 seated');

  await page.locator('st-seating-page header').getByRole('button', { name: 'Auto-seat' }).click();

  // Every confirmed guest gets a seat, and the summary says who went where.
  await expect(seatedFigure(page)).toHaveText('100/100 seated');
  const summary = page
    .getByRole('status')
    .filter({ has: page.getByRole('heading', { name: 'Auto-seated 16 guests' }) });
  await expect(summary).toBeVisible();
  await expect(summary.getByRole('listitem').first()).toBeVisible();
  await expect(summary).toContainText(/Kept Dev Malhotra and Rohan Kapoor at different tables|at T\d|at Long/);
  await expect(toast(page)).toContainText('Auto-seated 16 guests');

  // Undo from the toast.
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await expect(seatedFigure(page)).toHaveText('84/100 seated');
  await expect(toast(page)).toContainText('Undid: auto-seat 16 guests');

  // Redo with Shift+Cmd/Ctrl+Z, then undo again with Cmd/Ctrl+Z.
  await page.locator('body').focus();
  await page.keyboard.press(`Shift+${MOD}+z`);
  await expect(seatedFigure(page)).toHaveText('100/100 seated');
  await expect(toast(page)).toContainText('Redid: auto-seat 16 guests');

  await page.keyboard.press(`${MOD}+z`);
  await expect(seatedFigure(page)).toHaveText('84/100 seated');
});
