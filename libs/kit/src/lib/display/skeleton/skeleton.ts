import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SkeletonShape = 'line' | 'block' | 'circle';

/**
 * A loading placeholder. Hidden from assistive tech: announce loading on the
 * region (aria-busy) instead of on each bone.
 *
 * ```html
 * <st-skeleton shape="circle" width="30px" />  <st-skeleton width="60%" />
 * ```
 */
@Component({
  selector: 'st-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-skeleton',
    'aria-hidden': 'true',
    '[attr.data-shape]': 'shape()',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
  },
  template: '',
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 12px;
      border-radius: var(--st-radius-sm);
      background: var(--st-surface-3);
      animation: st-pulse 1.4s var(--st-ease-settle) infinite;
    }

    :host([data-shape='block']) {
      height: 72px;
      border-radius: var(--st-radius-lg);
    }

    :host([data-shape='circle']) {
      width: var(--st-size-seat);
      height: auto;
      aspect-ratio: 1;
      border-radius: 50%;
    }
  `,
})
export class StSkeleton {
  readonly shape = input<SkeletonShape>('line');
  /** Any CSS length; defaults per shape. */
  readonly width = input<string>();
  readonly height = input<string>();
}
