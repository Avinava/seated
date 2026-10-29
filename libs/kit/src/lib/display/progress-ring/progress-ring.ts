import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, numberAttribute } from '@angular/core';

const R = 18;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * A 44px progress ring (seated vs. attending, say) exposed as a progressbar,
 * with the percentage in mono at its centre.
 *
 * ```html
 * <st-progress-ring [value]="seated" [max]="attending" label="Guests seated" />
 * ```
 */
@Component({
  selector: 'st-progress-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-progress-ring',
    role: 'progressbar',
    '[attr.aria-label]': 'label()',
    'aria-valuemin': '0',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuenow]': 'clamped()',
    '[attr.aria-valuetext]': 'valueText()',
    '[class.is-complete]': 'ratio() >= 1',
  },
  template: `
    <svg viewBox="0 0 44 44" aria-hidden="true" focusable="false">
      <circle class="track" cx="22" cy="22" [attr.r]="r" />
      <circle
        class="fill"
        cx="22"
        cy="22"
        [attr.r]="r"
        [attr.stroke-dasharray]="circumference"
        [attr.stroke-dashoffset]="offset()"
      />
    </svg>
    @if (showValue()) {
      <span class="value" aria-hidden="true">{{ percent() }}</span>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: inline-grid;
      place-items: center;
      width: 44px;
      height: 44px;
      flex: none;
    }

    svg {
      position: absolute;
      inset: 0;
      transform: rotate(-90deg);
    }

    circle {
      fill: none;
      stroke-width: 5;
    }

    .track {
      stroke: var(--st-surface-3);
    }

    .fill {
      stroke: var(--st-accent);
      stroke-linecap: round;
      transition: stroke-dashoffset var(--st-dur-slow) var(--st-ease-settle);
    }

    :host(.is-complete) .fill {
      stroke: var(--st-ok);
    }

    .value {
      font-family: var(--st-font-mono);
      font-size: 10px;
      font-variant-numeric: tabular-nums;
      color: var(--st-text);
      letter-spacing: 0;
    }
  `,
})
export class StProgressRing {
  readonly value = input(0, { transform: numberAttribute });
  readonly max = input(100, { transform: numberAttribute });
  /** Accessible name, e.g. "Guests seated". */
  readonly label = input.required<string>();
  readonly showValue = input(true, { transform: booleanAttribute });

  protected readonly r = R;
  protected readonly circumference = CIRCUMFERENCE;

  protected readonly clamped = computed(() => Math.min(Math.max(this.value(), 0), Math.max(this.max(), 0)));
  protected readonly ratio = computed(() => (this.max() > 0 ? this.clamped() / this.max() : 0));
  protected readonly offset = computed(() => CIRCUMFERENCE * (1 - this.ratio()));
  protected readonly percent = computed(() => `${Math.round(this.ratio() * 100)}%`);
  protected readonly valueText = computed(
    () => $localize`:@@stProgress.of:${this.clamped()}:value: of ${this.max()}:max:`,
  );
}
