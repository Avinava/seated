import { expect, openSample, test } from './fixtures';

test('imports the sample CSV with review, then undoes it', async ({ page }) => {
  await openSample(page, 'import');
  const guestsLink = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /^Guests/ });
  await expect(guestsLink).toContainText('120');

  // Step 1: choose
  await page.getByRole('button', { name: /^Use sample:/ }).click();

  // Step 2: map columns. Headers are matched by name, so Name is already mapped.
  await expect(page.getByRole('heading', { name: 'Match columns' })).toBeFocused();
  await expect(page.getByRole('combobox', { name: /^Name/ })).not.toHaveValue('');
  await page.getByRole('button', { name: 'Review rows' }).click();

  // Step 3: review shows problems and duplicates, each with its own filter.
  await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeFocused();
  const filters = page.getByRole('radiogroup', { name: 'Show rows' });
  const rows = page.getByRole('table', { name: 'Rows in the file' }).locator('tbody tr');

  const count = async (name: string) =>
    Number((await filters.getByRole('radio', { name: new RegExp(`^${name}`) }).textContent())?.match(/\d+/)?.[0]);

  // Problems: every row listed says what is wrong with it.
  const problems = await count('Problems');
  expect(problems).toBeGreaterThan(0);
  await filters.getByRole('radio', { name: /^Problems/ }).click();
  await expect(rows).toHaveCount(problems);
  for (const row of await rows.all()) await expect(row.locator('.err').first()).toBeVisible();

  // Duplicates of guests already in the event.
  const duplicates = await count('Duplicates');
  expect(duplicates).toBeGreaterThan(0);
  await filters.getByRole('radio', { name: /^Duplicates/ }).click();
  await expect(rows).toHaveCount(duplicates);
  await expect(rows.getByText('Duplicate', { exact: true }).first()).toBeVisible();
  // A duplicate asks what to do with it: merge, keep both or skip.
  await expect(rows.first().getByRole('radio', { name: 'Merge' })).toBeVisible();

  // Import
  const run = page.getByRole('button', { name: /^Import \d+ rows$/ });
  const importing = Number((await run.textContent())?.match(/\d+/)?.[0]);
  expect(importing).toBeGreaterThan(0);
  await run.click();

  await expect(page.getByRole('heading', { name: 'Import finished' })).toBeVisible();
  const stat = (label: string) =>
    page.locator('st-stat', { has: page.getByText(label, { exact: true }) }).locator('dd');
  const added = Number(await stat('Added').first().textContent());
  const merged = Number(await stat('Updated').first().textContent());
  expect(added + merged).toBe(importing);
  expect(added).toBeGreaterThan(0);
  await expect(guestsLink).toContainText(String(120 + added));

  // Undo restores the guest count.
  await page.getByRole('button', { name: 'Undo import' }).click();
  await expect(guestsLink).toContainText('120');
});
