import AxeBuilder from '@axe-core/playwright';
import { getStoryContext, waitForPageReady, type TestRunnerConfig } from '@storybook/test-runner';

const THEMES = ['light', 'dark'] as const;

/**
 * Every story is an interaction test (its `play` function runs first) and an
 * accessibility test: once it settles, axe scans the story root for WCAG 2.x
 * A/AA violations in both themes, so contrast is checked in light and dark.
 * Opt out per story with `parameters: { a11y: { test: 'off' } }`.
 */
const config: TestRunnerConfig = {
  async postVisit(page, context) {
    const story = await getStoryContext(page, context);
    const a11y = story.parameters['a11y'] as { test?: string; disable?: boolean } | undefined;
    if (a11y?.disable || a11y?.test === 'off') return;

    await waitForPageReady(page);
    const problems: string[] = [];
    for (const theme of THEMES) {
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
        document.documentElement.setAttribute('data-motion', 'reduce');
      }, theme);
      const results = await new AxeBuilder({ page })
        .include('#storybook-root')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      for (const v of results.violations) {
        const nodes = v.nodes.map((n) => `    ${n.target.join(' ')}: ${n.failureSummary ?? ''}`).join('\n');
        problems.push(`[${theme}] ${v.id} (${v.impact}): ${v.help}\n${nodes}`);
      }
    }
    if (problems.length > 0) {
      throw new Error(`Accessibility violations in ${context.title} / ${context.name}:\n${problems.join('\n')}`);
    }
  },
};

export default config;
