/**
 * Renders the app icons in apps/seated/public/icons from the logo geometry:
 * a round table with six seats, one lit, on the paper background. Maskable
 * icons keep the mark inside the central 80% safe zone.
 *
 *   pnpm exec tsx tools/render-icons.ts
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const out = resolve(import.meta.dirname, '../apps/seated/public/icons');
const paper = '#f9f9f7';
const ink = '#181e24';
const teal = '#0f8a83';

function svg(size: number, scale: number): string {
  const seats = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * 2 * Math.PI - Math.PI / 2;
    const lit = i === 0;
    return `<circle cx="${16 + Math.cos(a) * 12.5}" cy="${16 + Math.sin(a) * 12.5}" r="2.6" fill="${lit ? teal : 'none'}" stroke="${lit ? teal : ink}" stroke-width="1.6"/>`;
  }).join('');
  const offset = (32 - 32 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
    <rect width="32" height="32" fill="${paper}"/>
    <g transform="translate(${offset} ${offset}) scale(${scale})"><circle cx="16" cy="16" r="7" fill="${ink}"/>${seats}</g>
  </svg>`;
}

const icons: [string, number, number][] = [
  ['icon-192.png', 192, 0.78],
  ['icon-512.png', 512, 0.78],
  ['maskable-512.png', 512, 0.6],
  ['apple-touch-icon.png', 180, 0.7],
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, scale] of icons) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${svg(size, scale)}</body>`);
  await page.locator('svg').screenshot({ path: resolve(out, name), omitBackground: false });
}
await browser.close();
console.log(`icons written to ${out}`);
