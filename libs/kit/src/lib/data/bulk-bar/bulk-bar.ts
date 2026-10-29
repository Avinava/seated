import { formatNumber } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  input,
  numberAttribute,
  output,
} from '@angular/core';
import { StButton } from '../../actions/button/button';
import { StIcon } from '../../icons/icon/icon';

/**
 * The floating bar that appears while rows are selected: a count, the owner's
 * bulk actions (projected; use `variant="ghost"` buttons, which inherit the
 * bar's colour) and a Clear button. Position it yourself, usually fixed to the
 * bottom of the list.
 *
 * ```html
 * @if (picked().size) {
 *   <st-bulk-bar [count]="picked().size" (cleared)="picked.set(new Set())">
 *     <button stButton variant="ghost" size="sm">Assign table</button>
 *   </st-bulk-bar>
 * }
 * ```
 */
@Component({
  selector: 'st-bulk-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StButton, StIcon],
  host: {
    class: 'st-bulk-bar',
    role: 'group',
    '[attr.aria-label]': 'label()',
    'data-noprint': '',
  },
  template: `
    <span class="count" aria-live="polite" aria-atomic="true">{{ countText() }}</span>
    <span class="sep" aria-hidden="true"></span>
    <div class="actions"><ng-content /></div>
    <button stButton variant="ghost" size="sm" class="clear" (click)="cleared.emit()">
      <st-icon name="x" [size]="14" />{{ clearText }}
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--st-space-2);
      min-height: 44px;
      padding: var(--st-space-1) var(--st-space-1) var(--st-space-1) var(--st-space-4);
      border-radius: var(--st-radius-xl);
      background: var(--st-text);
      color: var(--st-bg);
      box-shadow: var(--st-shadow-raised);
      font-size: var(--st-fs-md);
      animation: st-fade-up var(--st-dur-base) var(--st-ease-settle);
    }

    .count {
      font-family: var(--st-font-mono);
      font-size: var(--st-fs-xs);
      letter-spacing: var(--st-tracking-mono);
      text-transform: uppercase;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .sep {
      width: 1px;
      height: 18px;
      background: currentColor;
      opacity: 0.25;
    }

    .actions {
      display: inline-flex;
      align-items: center;
      gap: var(--st-space-1);
    }

    .actions:empty {
      display: none;
    }
  `,
})
export class StBulkBar {
  /** How many items are selected. */
  readonly count = input.required({ transform: numberAttribute });
  readonly label = input($localize`:@@kit.bulkBar.label:Bulk actions`);
  /** The Clear button was pressed; the owner empties its selection. */
  readonly cleared = output();

  private readonly locale = inject(LOCALE_ID);
  protected readonly clearText = $localize`:@@kit.bulkBar.clear:Clear`;
  protected readonly countText = computed(
    () => $localize`:@@kit.bulkBar.count:${formatNumber(this.count(), this.locale)}:count: selected`,
  );
}
