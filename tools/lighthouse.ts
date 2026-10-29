/**
 * Lighthouse budgets for the prerendered pages (home, brand kit, find your
 * seat), served by tools/serve-static.ts. Settings and assertions live in
 * lighthouserc.json; this wrapper builds the app and points Lighthouse at
 * Playwright's Chromium, so no system Chrome is needed.
 *
 *   pnpm exec tsx tools/lighthouse.ts      (LH_SKIP_BUILD=1 to reuse dist/seated/browser)
 */
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv = process.env): void {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!process.env['LH_SKIP_BUILD']) run('pnpm', ['exec', 'ng', 'build', 'seated']);
if (!existsSync('dist/seated/browser/index.html')) {
  console.error('dist/seated/browser is missing. Run `pnpm exec ng build seated` first.');
  process.exit(1);
}

const chromePath = chromium.executablePath();
if (!existsSync(chromePath)) {
  console.error(
    `Playwright's Chromium is not installed (${chromePath}). Run \`pnpm exec playwright install chromium\`.`,
  );
  process.exit(1);
}

run('pnpm', ['exec', 'lhci', 'autorun', `--collect.chromePath=${chromePath}`], {
  ...process.env,
  CHROME_PATH: chromePath,
});
