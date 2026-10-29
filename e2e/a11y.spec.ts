import { type Page } from '@playwright/test';
import { WEDDING, expect, floorPlan, test, type AxeOptions } from './fixtures';

/**
 * axe (WCAG 2.2 A and AA) on every route, in light and dark, plus phone width
 * for the screens people use on a phone. A route is scanned once it has
 * settled: its heading is up and nothing is still loading.
 */
interface Route {
  readonly name: string;
  readonly open: (page: Page) => Promise<void>;
}

async function settled(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

/** A real share link, built by the app from the sample wedding. */
async function shareLink(page: Page): Promise<string> {
  await page.goto(`${WEDDING}/share`);
  const field = page.getByRole('textbox', { name: 'Link' });
  await expect(field).toHaveValue(/\/s#.+/);
  return field.inputValue();
}

const ROUTES: readonly Route[] = [
  {
    name: 'home',
    open: async (p) => {
      await p.goto('/');
      // Prerendered with skeleton cards; the real ones come from IndexedDB.
      await expect(p.getByText("Ananya & Kabir's wedding")).toBeVisible();
      await settled(p);
    },
  },
  { name: 'guests', open: (p) => p.goto(`${WEDDING}/guests`).then(() => settled(p)) },
  {
    name: 'guests, panel open',
    open: async (p) => {
      await p.goto(`${WEDDING}/guests?guest=g-004`);
      await expect(p.getByRole('dialog')).toBeVisible();
      await expect(p.getByRole('dialog').getByRole('textbox', { name: /^Full name/ })).not.toHaveValue('');
    },
  },
  {
    name: 'seating',
    open: async (p) => {
      await p.goto(`${WEDDING}/seating`);
      await expect(floorPlan(p)).toBeVisible();
      await settled(p);
    },
  },
  {
    name: 'import, step 1',
    open: async (p) => {
      await p.goto(`${WEDDING}/import`);
      await expect(p.getByRole('button', { name: /^Use sample:/ })).toBeVisible();
    },
  },
  {
    name: 'share',
    open: async (p) => {
      await shareLink(p);
      await p.locator('st-qr-card').scrollIntoViewIfNeeded();
      await settled(p);
    },
  },
  { name: 'print', open: (p) => p.goto(`${WEDDING}/print`).then(() => settled(p)) },
  { name: 'brand', open: (p) => p.goto('/brand').then(() => settled(p)) },
  {
    name: 'find your seat',
    open: async (p) => {
      await p.goto(await shareLink(p));
      await expect(p.getByRole('searchbox', { name: /^Type your name/ })).toBeVisible();
    },
  },
  {
    name: 'find your seat, result',
    open: async (p) => {
      await p.goto(await shareLink(p));
      await p.getByRole('searchbox', { name: /^Type your name/ }).fill('Kamla');
      await p.getByRole('button', { name: /Kamla Mehta/ }).click();
      await expect(p.getByText(/Hi Kamla/)).toBeVisible();
    },
  },
  {
    name: 'not found',
    open: async (p) => {
      await p.goto('/no-such-page');
      await expect(p.getByRole('heading', { name: 'Nothing at this address' })).toBeVisible();
    },
  },
];

const PHONE = new Set(['home', 'seating', 'find your seat', 'find your seat, result']);

/**
 * Scan the page with every rule, except that seats on the floor plan skip
 * target-size (WCAG 2.5.8). The plan is a scaled map: at "Fit" a 30px seat
 * draws at 9 to 15px so the whole room shows, and seats sit where the chairs
 * are. That is the Essential exception the Understanding document gives for
 * map pins. People can zoom to 100% (30px seats), every seat is reachable as
 * one tab stop with arrow keys, and the same commands exist in the unseated
 * list and the palette. The rest of the plan, and the rest of the page,
 * still get every rule.
 */
async function scan(page: Page, axe: (o?: AxeOptions) => Promise<void>, label: string): Promise<void> {
  const hasFloor = (await page.locator('st-floor').count()) > 0;
  await axe({ label, exclude: hasFloor ? ['st-floor'] : [] });
  if (hasFloor) await axe({ label: `${label}, floor plan`, include: ['st-floor'], disable: ['target-size'] });
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    for (const route of ROUTES) {
      test(`${route.name} has no axe violations`, async ({ page, axe }) => {
        await route.open(page);
        await scan(page, axe, `${route.name} (${scheme})`);
      });
    }

    test.describe('at 390px', () => {
      test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      for (const route of ROUTES.filter((r) => PHONE.has(r.name))) {
        test(`${route.name} has no axe violations`, async ({ page, axe }) => {
          await route.open(page);
          await scan(page, axe, `${route.name} (${scheme}, 390px)`);
        });
      }
    });
  });
}
