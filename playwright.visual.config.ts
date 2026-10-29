import { defineConfig, devices } from '@playwright/test';

/**
 * Visual regression for the design kit: every Storybook story, light and dark,
 * compared with baselines in e2e/visual/__screenshots__.
 *
 * Pixels depend on the OS font stack and rasteriser, so this runs only inside
 * the pinned Playwright Docker image (tools/visual.sh), on a Mac and in CI
 * alike. Baselines carry no platform suffix for that reason.
 */
const CI = !!process.env['CI'];
const PORT = Number(process.env['VISUAL_PORT'] ?? 6007);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: 'e2e/visual',
  // Not under test-results/: the flows config empties that folder when it starts.
  outputDir: 'test-results-visual',
  snapshotPathTemplate: 'e2e/visual/__screenshots__/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: CI,
  retries: 0,
  reporter: CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/visual' }]] : [['list']],
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.002,
    },
  },
  use: {
    baseURL,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'visual',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 },
    },
  ],
  webServer: {
    // Plain node: Node 24 strips the types from tools/serve-static.ts, so this needs no node_modules binaries.
    command: `node tools/serve-static.ts storybook-static ${PORT}`,
    url: `${baseURL}/index.json`,
    reuseExistingServer: !CI,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
