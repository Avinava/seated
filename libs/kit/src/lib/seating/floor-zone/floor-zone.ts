import { ChangeDetectionStrategy, Component, input, numberAttribute } from '@angular/core';

export type FloorZoneKind = 'stage' | 'bar' | 'exit' | 'entrance' | 'dance-floor';

/**
 * A fixed area of the room (stage, bar, exits) drawn under the tables. Large
 * areas are hatched, service points tinted, doors marked in the ok tone; the
 * label is always visible text so the zone never relies on colour.
 *
 * ```html
 * <st-floor-zone kind="exit" label="Exit" [x]="1140" [y]="360" [w]="40" [h]="80" />
 * ```
 */
@Component({
  selector: 'st-floor-zone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-floor-zone',
    '[attr.data-kind]': 'kind()',
    '[style.left.px]': 'x()',
    '[style.top.px]': 'y()',
    '[style.width.px]': 'w()',
    '[style.height.px]': 'h()',
  },
  template: `<span class="label">{{ label() }}</span>`,
  styles: `
    :host {
      --_ink: var(--st-text-3);
      position: absolute;
      display: grid;
      place-items: center;
      border: 1px dashed var(--st-line-2);
      border-radius: var(--st-radius-lg);
      background: var(--st-surface-2);
      pointer-events: none;
    }

    :host([data-kind='stage']),
    :host([data-kind='dance-floor']) {
      background: repeating-linear-gradient(-45deg, var(--st-surface-2) 0 6px, var(--st-surface-3) 6px 7px);
    }

    :host([data-kind='exit']),
    :host([data-kind='entrance']) {
      --_ink: var(--st-ok);
      border: 1.5px solid var(--st-ok);
      background: var(--st-ok-soft);
    }

    .label {
      padding: 2px 6px;
      border-radius: var(--st-radius-sm);
      background: var(--st-surface);
      color: var(--_ink);
      font-family: var(--st-font-mono);
      font-size: var(--st-fs-2xs);
      letter-spacing: var(--st-tracking-mono);
      text-transform: uppercase;
      white-space: nowrap;
    }
  `,
})
export class StFloorZone {
  readonly kind = input.required<FloorZoneKind>();
  readonly label = input.required<string>();
  readonly x = input.required({ transform: numberAttribute });
  readonly y = input.required({ transform: numberAttribute });
  readonly w = input.required({ transform: numberAttribute });
  readonly h = input.required({ transform: numberAttribute });
}
