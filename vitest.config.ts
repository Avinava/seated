import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { storybookAngularVitest } from '@storybook/angular-vite/vitest';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

/*
 * The kit's Storybook stories as tests (`pnpm run test-storybook`). Every story runs
 * in headless Chromium: it renders, its `play` function runs, then addon-a11y scans
 * it with axe (`a11y.test: 'error'` in libs/kit/.storybook/preview.ts). There is one
 * project per theme, so both happen in light and in dark. Reduced motion keeps the
 * scans from catching a transition halfway. Any console.error fails the story
 * (libs/kit/.storybook/vitest.setup.ts), since Angular logs render errors instead of throwing.
 *
 * It lives at the root because the Storybook UI's Testing widget looks for it from
 * libs/kit upwards and resolves the builder's workspace-relative styles from here.
 * Domain tests have their own config; kit and app specs run through `ng test`.
 */
const configDir = fileURLToPath(new URL('libs/kit/.storybook', import.meta.url));

// The Angular build options (styles, zoneless) come from the kit:storybook target.
const workspace = JSON.parse(readFileSync(new URL('angular.json', import.meta.url), 'utf8')) as {
  projects: { kit: { architect: { storybook: { options: { styles: string[]; zoneless: boolean } } } } };
};
const { styles, zoneless } = workspace.projects.kit.architect.storybook.options;

// The Testing widget runs one project under a fixed name, so it gets light only.
const themes = process.env['VITEST_STORYBOOK'] === 'true' ? ['light'] : ['light', 'dark'];

export default defineConfig({
  plugins: [storybookAngularVitest({ styles, zoneless })],
  test: {
    projects: themes.map((theme) => ({
      extends: true,
      plugins: [storybookTest({ configDir, initialGlobals: { theme, motion: 'reduce' } })],
      test: {
        name: `storybook-${theme}`,
        setupFiles: [`${configDir}/vitest.setup.ts`],
        browser: {
          enabled: true,
          headless: true,
          provider: playwright(),
          instances: [{ browser: 'chromium' }],
        },
      },
    })),
  },
});
