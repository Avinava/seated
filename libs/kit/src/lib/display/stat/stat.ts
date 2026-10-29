import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A headline number with its label and an optional caption. Marked up as a
 * description pair so "Seated, 168" reads in order.
 *
 * ```html
 * <st-stat label="Seated" [value]="168" caption="of 207 attending" />
 * ```
 */
@Component({
  selector: 'st-stat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'st-stat' },
  template: `
    <dl>
      <dt class="label">{{ label() }}</dt>
      <dd class="value">{{ value() }}</dd>
      @if (caption()) {
        <dd class="caption">{{ caption() }}</dd>
      }
    </dl>
  `,
  styles: `
    :host {
      display: block;
    }

    dl,
    dd {
      margin: 0;
    }

    dl {
      display: grid;
      gap: 6px;
    }

    .label {
      font-family: var(--st-font-mono);
      font-size: var(--st-fs-2xs);
      letter-spacing: var(--st-tracking-mono);
      text-transform: uppercase;
      color: var(--st-text-3);
    }

    .value {
      font-family: var(--st-font-mono);
      font-size: var(--st-fs-3xl);
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
      line-height: 1;
      color: var(--st-text);
    }

    .caption {
      font-size: var(--st-fs-sm);
      color: var(--st-text-2);
    }
  `,
})
export class StStat {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly caption = input<string>();
}
