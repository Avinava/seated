import '@angular/localize/init';
import type { Decorator, Preview } from '@storybook/angular';

type Theme = 'system' | 'light' | 'dark';
type Motion = 'full' | 'reduce';

/**
 * Mirrors the app: the theme is a `data-theme` attribute on <html> (absent means
 * follow the OS), and reduced motion is a `data-motion` attribute that the
 * preview stylesheet maps onto the same rule as `prefers-reduced-motion`.
 */
const withDocumentGlobals: Decorator = (story, context) => {
  const root = document.documentElement;
  const theme = (context.globals['theme'] ?? 'light') as Theme;
  const motion = (context.globals['motion'] ?? 'full') as Motion;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  root.setAttribute('data-motion', motion);
  return story();
};

const preview: Preview = {
  tags: ['autodocs'],
  decorators: [withDocumentGlobals],
  globalTypes: {
    theme: {
      description: 'Colour theme (sets data-theme on <html>)',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
          { value: 'system', title: 'Follow system', icon: 'browser' },
        ],
        dynamicTitle: true,
      },
    },
    motion: {
      description: 'Motion preference',
      toolbar: {
        title: 'Motion',
        icon: 'lightning',
        items: [
          { value: 'full', title: 'Full motion' },
          { value: 'reduce', title: 'Reduced motion' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
    motion: 'full',
  },
  parameters: {
    layout: 'centered',
    backgrounds: { disable: true },
    controls: {
      expanded: true,
      matchers: { color: /(background|color)$/i },
    },
    a11y: {
      // Violations fail the interaction run (see test-runner.ts), not just the panel.
      test: 'error',
    },
    options: {
      storySort: {
        order: ['Introduction', 'Foundations', 'Actions', 'Display', 'Forms', 'Seating', 'Overlay', 'Data', '*'],
      },
    },
  },
};

export default preview;
