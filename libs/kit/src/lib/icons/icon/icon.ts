import { ChangeDetectionStrategy, Component, computed, input, numberAttribute } from '@angular/core';
import { ICONS, type IconName } from './icons';

/**
 * Inline stroke icon from the kit registry. Decorative by default (hidden from
 * assistive tech); pass `label` when the icon carries meaning on its own.
 *
 * ```html
 * <st-icon name="search" />
 * <st-icon name="alert" label="Conflict" size="20" />
 * ```
 */
@Component({
  selector: 'st-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-icon',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': 'label() ? null : "true"',
    '[style.--st-icon-size.px]': 'size()',
  },
  template: `
    <svg
      viewBox="0 0 24 24"
      [attr.width]="size()"
      [attr.height]="size()"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
    >
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      width: var(--st-icon-size);
      height: var(--st-icon-size);
      line-height: 0;
      vertical-align: middle;
    }
  `,
})
export class StIcon {
  readonly name = input.required<IconName>();
  /** Rendered size in CSS px. */
  readonly size = input(16, { transform: numberAttribute });
  readonly strokeWidth = input(1.75, { transform: numberAttribute });
  /** Accessible name. When set the icon is announced as an image. */
  readonly label = input<string>();

  protected readonly paths = computed(() => ICONS[this.name()]);
}
