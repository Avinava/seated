import { InteractivityChecker } from '@angular/cdk/a11y';
import type { Provider } from '@angular/core';

/**
 * jsdom has no layout, so the CDK considers every element invisible and the
 * focus trap finds nothing to focus. Specs swap in a checker that trusts the DOM.
 * Test-only; not exported from the kit.
 */
export const layoutFreeInteractivity: Provider = {
  provide: InteractivityChecker,
  useValue: {
    isDisabled: (el: Element) => el.hasAttribute('disabled'),
    isVisible: () => true,
    isTabbable: (el: Element) => el.matches('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]'),
    isFocusable: (el: Element) => el.matches('button, input, a[href], [tabindex]'),
  } satisfies Partial<InteractivityChecker>,
};
