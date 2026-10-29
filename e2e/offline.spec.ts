import { expect, test } from './fixtures';

// The one spec that lets the Angular service worker run.
test.use({ serviceWorkers: 'allow' });

test('after one visit the app loads and works offline', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Your events' })).toBeVisible();

  // Wait until the worker is active and every file of the prefetched "app" group is in its cache.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const manifest = (await (await fetch('/ngsw.json', { cache: 'no-store' })).json()) as {
            assetGroups: { name: string; urls: string[] }[];
          };
          const wanted = manifest.assetGroups.find((g) => g.name === 'app')?.urls ?? [];
          const name = (await caches.keys()).find((k) => k.endsWith(':assets:app:cache'));
          if (!name || wanted.length === 0) return 'not ready';
          const cache = await caches.open(name);
          const have = await Promise.all(wanted.map((u) => cache.match(u)));
          return have.every(Boolean) ? 'ready' : 'not ready';
        }),
      { message: 'the service worker cached the app shell', timeout: 30_000 },
    )
    .toBe('ready');

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { level: 1, name: 'Your events' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: "You're offline" })).toBeVisible();
  // The data is local, so the sample events are still there.
  await expect(page.getByText("Ananya & Kabir's wedding")).toBeVisible();

  // And a client-rendered screen still opens.
  await page.getByText("Ananya & Kabir's wedding").click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
