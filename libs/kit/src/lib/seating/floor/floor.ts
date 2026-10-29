import { ChangeDetectionStrategy, Component, computed, input, numberAttribute } from '@angular/core';

/**
 * The floor plan surface: a dot-grid plane of `width` x `height` plan units,
 * scaled by `zoom`. It is its own scroll container; project `st-table` and
 * `st-floor-zone` children positioned in plan units.
 *
 * ```html
 * <st-floor [width]="1200" [height]="800" [zoom]="zoom()" aria-label="Floor plan">
 *   <st-floor-zone kind="stage" label="Stage" [x]="40" [y]="40" [w]="320" [h]="80" />
 *   <st-table shape="round" label="T1" [seats]="seats" [x]="200" [y]="300" />
 * </st-floor>
 * ```
 */
@Component({
  selector: 'st-floor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-floor',
    role: 'region',
    '[attr.aria-label]': 'label()',
  },
  template: `
    <div class="sizer" [style.width.px]="width() * zoom()" [style.height.px]="height() * zoom()">
      <div class="plane" [style.width.px]="width()" [style.height.px]="height()" [style.transform]="transform()">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      overflow: auto;
      overscroll-behavior: contain;
      background: var(--st-bg);
    }

    .sizer {
      position: relative;
      margin: var(--st-space-6);
    }

    .plane {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
      border: 1px solid var(--st-line);
      border-radius: var(--st-radius-2xl);
      background-color: var(--st-surface);
      background-image: radial-gradient(circle, var(--st-dot) 1.1px, transparent 1.6px);
      background-size: 20px 20px;
      background-position: 10px 10px;
      transition: transform var(--st-dur-base) var(--st-ease-settle);
    }
  `,
})
export class StFloor {
  /** Plan width in plan units (1 unit = 1 CSS px at 100% zoom). */
  readonly width = input.required({ transform: numberAttribute });
  readonly height = input.required({ transform: numberAttribute });
  readonly zoom = input(1, { transform: numberAttribute });
  // eslint-disable-next-line @angular-eslint/no-input-rename -- the native attribute is the API, and requiring it makes an unnamed control a compile error
  readonly label = input.required<string>({ alias: 'aria-label' });

  protected readonly transform = computed(() => (this.zoom() === 1 ? null : `scale(${this.zoom()})`));
}
