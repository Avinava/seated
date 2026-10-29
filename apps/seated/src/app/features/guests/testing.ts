import { InteractivityChecker } from '@angular/cdk/a11y';
import type { Provider } from '@angular/core';
import { createSampleWedding, type Guest, type SeatingEvent } from '@seated/domain';

/**
 * jsdom has no layout, so the CDK focus trap thinks nothing is visible. This
 * trusts the DOM instead (the kit's own specs do the same).
 */
export const layoutFreeInteractivity: Provider = {
  provide: InteractivityChecker,
  useValue: {
    isDisabled: (el: Element) => el.hasAttribute('disabled'),
    isVisible: () => true,
    isTabbable: (el: Element) =>
      el.matches('button:not([disabled]), input:not([disabled]), select, textarea, a[href], [tabindex="0"]'),
    isFocusable: (el: Element) => el.matches('button, input, select, textarea, a[href], [tabindex]'),
  } satisfies Partial<InteractivityChecker>,
};

/** Let signals, the router, virtual scrolling and deferred blocks settle. */
export async function settle(fixture: { whenStable(): Promise<unknown>; detectChanges(): void }, rounds = 4) {
  for (let i = 0; i < rounds; i++) {
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
  }
}

/** The fixed clock every guests spec runs at (AGENTS.md: 29 Oct 2026). */
export const NOW = new Date('2026-10-29T10:00:00+05:30');

export function wedding(): SeatingEvent {
  return createSampleWedding(NOW);
}

/**
 * The sample wedding padded out to `size` guests with unseated copies, for
 * performance checks. Copies keep groups, parties and tags; names get a suffix.
 */
export function bigWedding(size = 1000): SeatingEvent {
  const base = wedding();
  const guests: Guest[] = [...base.guests];
  for (let i = guests.length; i < size; i++) {
    const src = base.guests[i % base.guests.length] as Guest;
    guests.push({
      ...src,
      id: `g-${String(i + 1).padStart(4, '0')}`,
      name: `${src.name} ${Math.floor(i / base.guests.length)}`,
      email: '',
      plusOneOf: null,
      seat: null,
    });
  }
  return { ...base, guests };
}
