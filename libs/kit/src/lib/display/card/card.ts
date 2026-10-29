import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * A raised surface. `interactive` adds a hover lift for cards that contain a
 * primary link or button; the card itself never becomes a click target, so the
 * real control inside keeps its semantics.
 *
 * ```html
 * <st-card interactive><a href="/events/1">Mehta wedding</a></st-card>
 * ```
 */
@Component({
  selector: 'st-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-card',
    '[class.is-interactive]': 'interactive()',
    '[attr.data-padding]': 'padding()',
  },
  template: '<ng-content />',
  styles: `
    :host {
      --_pad: var(--st-space-5);
      position: relative;
      display: block;
      padding: var(--_pad);
      border: 1px solid var(--st-line);
      border-radius: var(--st-radius-2xl);
      background: var(--st-surface);
      color: var(--st-text);
      box-shadow: var(--st-shadow-raised);
    }

    :host([data-padding='none']) {
      --_pad: 0;
    }

    :host([data-padding='sm']) {
      --_pad: var(--st-space-3);
    }

    :host([data-padding='lg']) {
      --_pad: var(--st-space-8);
    }

    :host(.is-interactive) {
      transition:
        transform var(--st-dur-base) var(--st-ease-settle),
        border-color var(--st-dur-base) var(--st-ease-settle);
    }

    :host(.is-interactive:hover),
    :host(.is-interactive:focus-within) {
      border-color: var(--st-line-2);
      transform: translateY(-2px);
    }
  `,
})
export class StCard {
  readonly interactive = input(false, { transform: booleanAttribute });
  readonly padding = input<CardPadding>('md');
}
