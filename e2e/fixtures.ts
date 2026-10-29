import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Locator, type Page } from '@playwright/test';

/** Every test runs at the same moment as the screenshots: 29 Oct 2026, 10:00 in Bengaluru. */
export const NOW = new Date('2026-10-29T10:00:00+05:30');

/** The sample wedding that the app seeds on first run. */
export const WEDDING = '/events/ev-wedding';

/** WCAG 2.2 A and AA, the bar the kit's Storybook axe run also holds. */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export type Screen = 'guests' | 'seating' | 'import' | 'share' | 'print';

export interface AxeOptions {
  /** Limit the scan to these selectors. */
  readonly include?: readonly string[];
  /** Leave these selectors out, each with a reason in the calling test. */
  readonly exclude?: readonly string[];
  /** Rule ids to disable. Only with a written reason next to the call. */
  readonly disable?: readonly string[];
  /** Prefix for the failure message, e.g. the route and theme. */
  readonly label?: string;
}

interface Fixtures {
  /** Scan the page with axe and fail with a readable list of violations. */
  axe: (options?: AxeOptions) => Promise<void>;
}

/**
 * The shared test: a fixed clock before the first navigation, a fresh browser
 * context per test (so empty storage, and the sample events seed afresh), the
 * service worker blocked (see playwright.config.ts) and an `axe` helper.
 */
export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(NOW);
    await use(page);
  },
  axe: async ({ page }, use) => {
    await use(async (options = {}) => {
      let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
      for (const s of options.include ?? []) builder = builder.include(s);
      for (const s of options.exclude ?? []) builder = builder.exclude(s);
      if (options.disable?.length) builder = builder.disableRules([...options.disable]);
      const { violations } = await builder.analyze();
      const report = violations.map((v) => {
        const nodes = v.nodes
          .slice(0, 6)
          .map((n) => `    - ${n.target.join(' ')}\n      ${(n.failureSummary ?? '').replace(/\n/g, '\n      ')}`)
          .join('\n');
        const more = v.nodes.length > 6 ? `\n    ... and ${v.nodes.length - 6} more` : '';
        return `  ${v.id} (${v.impact ?? 'n/a'}): ${v.help}\n    ${v.helpUrl}\n${nodes}${more}`;
      });
      expect(violations, `${options.label ?? page.url()}: axe found violations\n${report.join('\n')}`).toEqual([]);
    });
  },
});

export { expect };

/** Open a screen of the sample wedding and wait until it has loaded. */
export async function openSample(page: Page, screen: Screen, query = ''): Promise<void> {
  await page.goto(`${WEDDING}/${screen}${query}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  if (screen === 'seating') await expect(floorPlan(page)).toBeVisible();
}

/** The floor plan widget (rendered @defer on idle). */
export function floorPlan(page: Page): Locator {
  return page.getByRole('region', { name: /^Floor plan/ });
}

/** A table on the plan by its id in the sample data, e.g. 't-3' or 't-long-b'. */
export function table(page: Page, id: string): Locator {
  return page.locator(`st-table[data-table-id="${id}"]`);
}

/** A seat on a table by its 1-based number, as people and screen readers count them. */
export function seat(page: Page, tableId: string, n: number): Locator {
  return table(page, tableId).getByRole('button', { name: new RegExp(`^Seat ${n},`) });
}

/**
 * The element's box once it has stopped moving: the plan zooms to fit after
 * it measures the stage, so a seat's first box can be a frame early.
 */
export async function settledBox(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  let last = '';
  let box = await locator.boundingBox();
  await expect
    .poll(async () => {
      box = await locator.boundingBox();
      const now = JSON.stringify(box);
      const same = now === last;
      last = now;
      return same && box !== null;
    })
    .toBe(true);
  return box!;
}

/** The "n/m seated" figure in the seating header. */
export function seatedFigure(page: Page): Locator {
  return page.locator('st-seating-page header .seated');
}

/** The CDK live region that carries polite announcements. */
export function liveRegion(page: Page): Locator {
  return page.locator('.cdk-live-announcer-element');
}

/** The toast region (one toast at a time). */
export function toast(page: Page): Locator {
  return page.locator('st-toast-host .toast');
}

/** Cmd on macOS, Ctrl elsewhere, as the app's Hotkeys reads it. */
export const MOD = 'ControlOrMeta';
