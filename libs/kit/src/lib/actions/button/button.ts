import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * The kit button. Applied to a native `<button>` or `<a>` so semantics, focus
 * and form behaviour stay native. Icons are projected next to the label.
 *
 * ```html
 * <button stButton variant="primary"><st-icon name="sparkles" /> Auto-seat</button>
 * ```
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- native host keeps button semantics
  selector: 'button[stButton], a[stButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-button',
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
  },
  template: '<ng-content />',
  styleUrl: './button.scss',
})
export class StButton {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
}
