import { ChangeDetectionStrategy, Component, computed, input, numberAttribute } from '@angular/core';

export type BarTone = 'default' | 'accent' | 'ok' | 'warn' | 'danger';

/**
 * A 6px linear meter (a table's fill, a meal tally) exposed as a progressbar.
 *
 * ```html
 * <st-bar [value]="8" [max]="10" label="T3 filled" />
 * ```
 */
@Component({
  selector: 'st-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-bar',
    role: 'progressbar',
    '[attr.aria-label]': 'label()',
    'aria-valuemin': '0',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuenow]': 'clamped()',
    '[attr.aria-valuetext]': 'valueText()',
    '[attr.data-tone]': 'tone()',
  },
  template: `<span class="fill" [style.inline-size.%]="ratio() * 100"></span>`,
  styles: `
    :host {
      --_fill: var(--st-text);
      display: block;
      height: 6px;
      border-radius: var(--st-radius-pill);
      background: var(--st-surface-3);
      overflow: hidden;
    }

    :host([data-tone='accent']) {
      --_fill: var(--st-accent);
    }

    :host([data-tone='ok']) {
      --_fill: var(--st-ok);
    }

    :host([data-tone='warn']) {
      --_fill: var(--st-warn);
    }

    :host([data-tone='danger']) {
      --_fill: var(--st-danger);
    }

    .fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--_fill);
      transition: inline-size var(--st-dur-slow) var(--st-ease-settle);
    }
  `,
})
export class StBar {
  readonly value = input(0, { transform: numberAttribute });
  readonly max = input(100, { transform: numberAttribute });
  readonly label = input.required<string>();
  readonly tone = input<BarTone>('default');

  protected readonly clamped = computed(() => Math.min(Math.max(this.value(), 0), Math.max(this.max(), 0)));
  protected readonly ratio = computed(() => (this.max() > 0 ? this.clamped() / this.max() : 0));
  protected readonly valueText = computed(
    () => $localize`:@@stProgress.of:${this.clamped()}:value: of ${this.max()}:max:`,
  );
}
