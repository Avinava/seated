import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the production build, served statically the way
 * GitHub Pages serves it (tools/serve-static.ts).
 *
 * - `flows`: the user flows and the axe sweep. This is the default and what the gate runs.
 * - `shots` and `record`: the README screenshots and screen recording. Tagged
 *   @shots and only defined when SHOTS=1 (`mise run shots`, `mise run record`),
 *   so a plain `playwright test` never rewrites docs/.
 *
 * The kit's visual regression tests have their own config (playwright.visual.config.ts)
 * because they run in a pinned Docker image against Storybook.
 */
const CI = !!process.env['CI'];
const SHOTS = !!process.env['SHOTS'];
const PORT = Number(process.env['E2E_PORT'] ?? 4500);
const baseURL = `http://127.0.0.1:${PORT}`;

const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } };

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  expect: { timeout: 7_000 },
  use: {
    baseURL,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    trace: 'on-first-retry',
    // Flows never see the service worker; the offline spec opts back in.
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'flows',
      testIgnore: ['shots/**', 'visual/**'],
      grepInvert: /@shots/,
      use: desktop,
    },
    ...(SHOTS
      ? [
          {
            name: 'shots',
            testDir: 'e2e/shots',
            testMatch: 'frames.spec.ts',
            grep: /@shots/,
            fullyParallel: true,
            use: { ...desktop, deviceScaleFactor: 2 },
          },
          {
            name: 'record',
            testDir: 'e2e/shots',
            testMatch: 'record.spec.ts',
            grep: /@shots/,
            use: {
              ...desktop,
              viewport: { width: 1280, height: 800 },
              video: { mode: 'on' as const, size: { width: 1280, height: 800 } },
            },
          },
        ]
      : []),
  ],
  webServer: {
    command: `pnpm exec ng build seated && pnpm exec tsx tools/serve-static.ts dist/seated/browser ${PORT}`,
    url: baseURL,
    reuseExistingServer: !CI,
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
