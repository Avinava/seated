import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The mark: a round table with six seats, one of them lit. */
@Component({
  selector: 'st-logo',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="7" class="top" />
      @for (seat of seats; track $index) {
        <circle [attr.cx]="seat.x" [attr.cy]="seat.y" r="2.6" [class.lit]="$index === 0" class="seat" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .top {
      fill: var(--st-text);
    }
    .seat {
      fill: none;
      stroke: var(--st-text);
      stroke-width: 1.6;
    }
    .lit {
      fill: var(--st-accent);
      stroke: var(--st-accent);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  readonly size = input(28);
  protected readonly seats = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * 2 * Math.PI - Math.PI / 2;
    return { x: 16 + Math.cos(a) * 12.5, y: 16 + Math.sin(a) * 12.5 };
  });
}
