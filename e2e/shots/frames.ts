import { type Page } from '@playwright/test';
import { WEDDING, expect, floorPlan, seat } from '../fixtures';

/**
 * The README frames: every screen state worth showing, its route, how to set
 * it up, and the theme and viewport it renders at. `mise run shots` renders
 * each to docs/screenshots/<id>_<name>_<theme>.png at 2x. design/README.md
 * mirrors this table; keep the two in step.
 */
export interface Frame {
  readonly id: string;
  readonly name: string;
  /** Path to open, relative to the app root. */
  readonly route: string;
  /** One line for the frame map in design/README.md. */
  readonly preset: string;
  readonly theme: 'light' | 'dark';
  readonly viewport: { readonly width: number; readonly height: number };
  /** Reduced motion is on for every frame except the ones that show motion. */
  readonly motion?: 'reduce' | 'no-preference';
  /** Steps after the route has loaded. */
  readonly setup?: (page: Page) => Promise<void>;
}

export const DESKTOP = { width: 1440, height: 900 } as const;
export const PHONE = { width: 390, height: 844 } as const;
export const HERO = { width: 1600, height: 1000 } as const;
export const SOCIAL = { width: 1280, height: 640 } as const;

/** The route has rendered: a heading is up, nothing is loading, and the fonts are in. */
export async function settle(page: Page): Promise<void> {
  await expect(page.getByRole('heading').first()).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  const path = new URL(page.url()).pathname;
  if (path.endsWith('/seating')) await expect(floorPlan(page)).toBeVisible();
  // Home is prerendered with skeleton cards; wait for the real ones from IndexedDB.
  if (path === '/') await expect(page.getByText("Ananya & Kabir's wedding")).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** Pick up a party from the unseated list by keyboard and aim it at an empty seat. */
export async function holdParty(page: Page, party: string, tableId: string, n: number): Promise<void> {
  const button = page
    .getByRole('complementary', { name: 'Unseated guests' })
    .getByRole('button', { name: new RegExp(`^${party}\\s*, \\d+ guests`) });
  await button.focus();
  await page.keyboard.press('Enter');
  await seat(page, tableId, n).focus();
  await expect(seat(page, tableId, n)).toHaveAccessibleName(/drop lands here/);
}

/** Find a guest on the public page and open her result. */
export async function findSeat(page: Page, query: string): Promise<void> {
  await page.getByRole('searchbox', { name: /^Type your name/ }).fill(query);
  await page.getByRole('list', { name: 'Matching guests' }).getByRole('button').first().click();
  await expect(page.getByText(/^Hi /)).toBeVisible();
  // The result heading takes focus for screen readers; the ring is noise in a still.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

/** Open the share page and return the guest link the app built. */
export async function shareLink(page: Page): Promise<string> {
  await page.goto(`${WEDDING}/share`);
  const field = page.getByRole('textbox', { name: 'Link' });
  await expect(field).toHaveValue(/\/s#.+/);
  return field.inputValue();
}

const seatingHeader = (page: Page) => page.locator('st-seating-page header');

const guests = `${WEDDING}/guests?by=party`;
const seating = `${WEDDING}/seating`;

export const FRAMES: readonly Frame[] = [
  {
    id: '2a',
    name: 'home',
    route: '/',
    preset: 'First visit: the three sample events',
    theme: 'light',
    viewport: DESKTOP,
  },
  {
    id: '2b',
    name: 'guests',
    route: guests,
    preset: 'Guest list grouped by party (`?by=party`)',
    theme: 'light',
    viewport: DESKTOP,
  },
  {
    id: '2c',
    name: 'guest-panel',
    route: `${WEDDING}/guests?guest=g-009`,
    preset: 'Guest panel open on Kamla Mehta (`?guest=g-009`)',
    theme: 'light',
    viewport: DESKTOP,
    setup: async (page) => {
      await expect(page.getByRole('dialog').getByRole('heading', { name: 'Kamla Mehta' })).toBeVisible();
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    },
  },
  {
    id: '2d',
    name: 'seating',
    route: seating,
    preset: 'Sample wedding as seeded: 84/100 seated, one conflict',
    theme: 'light',
    viewport: DESKTOP,
  },
  {
    id: '2e',
    name: 'seating-holding',
    route: seating,
    preset: 'The Boses picked up by keyboard, aimed at Long B seat 2 (drop preview)',
    theme: 'light',
    viewport: DESKTOP,
    setup: (page) => holdParty(page, 'The Boses', 't-long-b', 2),
  },
  {
    id: '2f',
    name: 'conflict',
    route: seating,
    preset: 'Keep-apart rule selected: Dev and Rohan highlighted at T3',
    theme: 'light',
    viewport: DESKTOP,
    setup: async (page) => {
      const rule = page
        .getByRole('complementary', { name: 'Rules and details' })
        .getByRole('button', { name: /^Keep apart .*Rohan Kapoor apart/ });
      await rule.click();
      await expect(rule).toHaveAttribute('aria-pressed', 'true');
      await rule.blur();
    },
  },
  {
    id: '2g',
    name: 'auto-seat',
    route: seating,
    preset: 'After Auto-seat: 100/100 and the summary in the rail',
    theme: 'light',
    viewport: DESKTOP,
    setup: async (page) => {
      await seatingHeader(page).getByRole('button', { name: 'Auto-seat' }).click();
      await expect(page.getByRole('heading', { name: /^Auto-seated/ })).toBeVisible();
      // Let the toast go: the summary is the subject.
      await page.locator('st-toast-host').getByRole('button', { name: 'Dismiss' }).click();
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    },
  },
  {
    id: '2h',
    name: 'import-review',
    route: `${WEDDING}/import`,
    preset: 'Sample CSV mapped and in review: problems and duplicates flagged',
    theme: 'light',
    viewport: DESKTOP,
    setup: async (page) => {
      await page.getByRole('button', { name: /^Use sample:/ }).click();
      await page.getByRole('button', { name: 'Review rows' }).click();
      await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeFocused();
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    },
  },
  {
    id: '2i',
    name: 'share',
    route: `${WEDDING}/share`,
    preset: 'Share page: link, QR card and live phone preview',
    theme: 'light',
    viewport: DESKTOP,
    setup: async (page) => {
      await expect(page.getByRole('textbox', { name: 'Link' })).toHaveValue(/\/s#.+/);
      await expect(page.locator('st-qr-card svg, st-qr-card canvas').first()).toBeVisible();
    },
  },
  {
    id: '2j',
    name: 'find-seat',
    route: 'share-link',
    preset: 'Public guest page from the share link, Kamla found (390px)',
    theme: 'light',
    viewport: PHONE,
    setup: (page) => findSeat(page, 'Kamla'),
  },
  {
    id: '2k',
    name: 'place-cards',
    route: `${WEDDING}/print`,
    preset: 'Print: place cards for every seated guest',
    theme: 'light',
    viewport: DESKTOP,
  },
  {
    id: '2l',
    name: 'brand',
    route: '/brand',
    preset: 'Brand kit: logo, colour, type and seat states',
    theme: 'light',
    viewport: DESKTOP,
  },
  { id: '2m', name: 'home', route: '/', preset: 'As 2a', theme: 'dark', viewport: DESKTOP },
  { id: '2n', name: 'seating', route: seating, preset: 'As 2d', theme: 'dark', viewport: DESKTOP },
  { id: '2o', name: 'guests', route: guests, preset: 'As 2b', theme: 'dark', viewport: DESKTOP },
  {
    id: '2p',
    name: 'find-seat',
    route: 'share-link',
    preset: 'As 2j',
    theme: 'dark',
    viewport: PHONE,
    setup: (page) => findSeat(page, 'Kamla'),
  },
  {
    id: '2q',
    name: 'just-placed',
    route: seating,
    preset: 'Zoomed to 100%, the Kauls dropped on Long B, caught mid-glow (motion on)',
    theme: 'light',
    viewport: DESKTOP,
    motion: 'no-preference',
    setup: async (page) => {
      await holdGlow(page);
      const zoomIn = page.getByRole('button', { name: 'Zoom in (plus)' });
      while (await zoomIn.isEnabled()) {
        const pct = await page.locator('st-floor-plan output').textContent();
        if (parseInt(pct ?? '0', 10) >= 100) break;
        await zoomIn.click();
        await expect(page.locator('st-floor-plan output')).not.toHaveText(pct ?? '');
      }
      await holdParty(page, 'The Kauls', 't-long-b', 3);
      await page.keyboard.press('Enter');
      await expect(seat(page, 't-long-b', 3)).toHaveAccessibleName(/Kaul/);
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await freezeAnimations(page, 90);
    },
  },
  {
    id: '2r',
    name: 'seating-narrow',
    route: seating,
    preset: 'Seating at 390px: list and rail become drawers',
    theme: 'light',
    viewport: PHONE,
  },
];

/**
 * Keep the just-placed state on screen: the seating store clears it with a
 * GLOW_MS (900ms) timeout, which a 2x screenshot can outlast. Only the glow
 * frame does this.
 */
async function holdGlow(page: Page): Promise<void> {
  await page.evaluate(() => {
    const original = window.setTimeout;
    window.setTimeout = ((handler: TimerHandler, ms?: number, ...args: unknown[]) =>
      ms === 900 ? 0 : original(handler, ms, ...args)) as typeof window.setTimeout;
  });
}

/** Pause every running animation at the same moment, so a motion frame is a still. */
async function freezeAnimations(page: Page, atMs: number): Promise<void> {
  await page.evaluate((t) => {
    for (const a of document.getAnimations()) {
      a.pause();
      a.currentTime = t;
    }
  }, atMs);
}
