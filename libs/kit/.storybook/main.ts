import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/angular-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.ts'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: {
    name: '@storybook/angular-vite',
    options: {
      // Absolute, so `ng run kit:storybook` and the Vitest run compile with the same tsconfig.
      tsconfig: fileURLToPath(new URL('tsconfig.json', import.meta.url)),
    },
  },
  core: {
    disableTelemetry: true,
  },
  // Pre-bundle the entry points only components import, so a cold dev server does not
  // re-optimise mid-session and load two copies of @angular/core.
  viteFinal: (config) => ({
    ...config,
    optimizeDeps: {
      ...config.optimizeDeps,
      include: [
        ...(config.optimizeDeps?.include ?? []),
        '@angular/core/rxjs-interop',
        '@angular/cdk/a11y',
        '@angular/cdk/scrolling',
      ],
    },
  }),
};

export default config;
