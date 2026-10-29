import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StIcon } from '../../icons/icon/icon';
import { type IconName } from '../../icons/icon/icons';

/**
 * What a list or plan shows when it has nothing yet: an icon, a heading, a
 * sentence of help (projected) and the next actions (projected with `actions`).
 *
 * ```html
 * <st-empty-state icon="users" heading="No guests yet">
 *   Import a CSV or add people one at a time.
 *   <div actions><button stButton variant="primary">Add guest</button></div>
 * </st-empty-state>
 * ```
 */
@Component({
  selector: 'st-empty-state',
  imports: [StIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'st-empty-state' },
  template: `
    @if (icon(); as name) {
      <span class="badge"><st-icon [name]="name" [size]="22" /></span>
    }
    @switch (level()) {
      @case (3) {
        <h3 class="heading">{{ heading() }}</h3>
      }
      @default {
        <h2 class="heading">{{ heading() }}</h2>
      }
    }
    <div class="body"><ng-content /></div>
    <div class="actions"><ng-content select="[actions]" /></div>
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: var(--st-space-2);
      max-width: 380px;
      margin-inline: auto;
      padding: var(--st-space-10) var(--st-space-6);
      text-align: center;
    }

    .badge {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      margin-bottom: var(--st-space-2);
      border-radius: var(--st-radius-xl);
      background: var(--st-surface-2);
      color: var(--st-text-2);
    }

    .heading {
      font-family: var(--st-font-display);
      font-size: var(--st-fs-xl);
      font-weight: 600;
      letter-spacing: var(--st-tracking-display);
      line-height: 1.15;
      color: var(--st-text);
    }

    .body {
      color: var(--st-text-2);
      font-size: var(--st-fs-base);
      line-height: 1.5;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--st-space-2);
      margin-top: var(--st-space-3);
    }

    .actions:empty {
      display: none;
    }
  `,
})
export class StEmptyState {
  readonly heading = input.required<string>();
  readonly icon = input<IconName>();
  /** Heading level to fit the surrounding outline. */
  readonly level = input<2 | 3, 2 | 3 | '2' | '3'>(2, { transform: (v) => (Number(v) === 3 ? 3 : 2) });
}
