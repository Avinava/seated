import { NOW, expect, openSample, test } from './fixtures';

test('the share link opens a guest page where Kamla finds her seat', async ({ page, context }) => {
  await openSample(page, 'share');
  // Read the link from the page itself, not the clipboard.
  const field = page.getByRole('textbox', { name: 'Link' });
  await expect(field).toHaveValue(/\/s#.+/);
  const link = await field.inputValue();

  const guest = await context.newPage();
  await guest.clock.setFixedTime(NOW);
  await guest.goto(link);
  await expect(guest.getByRole('heading', { level: 1, name: "Ananya & Kabir's wedding" })).toBeVisible();

  await guest.getByRole('searchbox', { name: /^Type your name/ }).fill('Kamla');
  await expect(guest.getByText('1 match')).toBeVisible();
  await guest
    .getByRole('list', { name: 'Matching guests' })
    .getByRole('button', { name: /Kamla Mehta/ })
    .click();

  const where = guest.getByRole('heading', { level: 2 });
  await expect(where).toBeFocused();
  await expect(where).toContainText('T1');
  await expect(where).toContainText('Seat 1');
  await expect(guest.getByText(/Hi Kamla, you're at/)).toBeVisible();
  // Her table is drawn with her seat lit.
  const table = guest.getByRole('group', { name: 'T1, your seat is 1' });
  await expect(table).toBeVisible();
  await expect(table.getByRole('button', { name: 'Seat 1, you' })).toHaveAttribute('data-state', 'picked');
});

test('a damaged link shows a friendly error', async ({ page }) => {
  await page.goto('/s#not-a-real-link');
  const problem = page.getByRole('alert');
  await expect(problem).toBeVisible();
  await expect(problem.getByRole('heading', { level: 2 })).toHaveText(/link/i);
  await expect(problem).toContainText(/hosts/);
});
