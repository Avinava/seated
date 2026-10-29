import { type FocusableOption } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, ElementRef, booleanAttribute, inject, input } from '@angular/core';
import { type Tone } from '@seated/domain';

export type SeatState = 'empty' | 'filled' | 'picked' | 'drop-target' | 'conflict';

/** The plain view model a table renders per seat. */
export interface SeatView {
  /** Up to two characters; empty for an empty seat. */
  readonly initials: string;
  readonly tone: Tone | null;
  readonly state: SeatState;
  /** Full accessible name, e.g. "Seat 4, Aarav Shah" or "Seat 5, empty". */
  readonly label: string;
  readonly justPlaced?: boolean;
}

/**
 * One seat: a 30px circular button. Every state changes border, ring and size
 * together, so colour is never the only signal. `justPlaced` plays a spring
 * pop and an accent glow that fades over --st-dur-glow.
 *
 * The accessible name is the full `label`, rendered as visually hidden text
 * rather than aria-label: the visible initials are an abbreviation of it, and
 * an aria-label that does not contain the visible text breaks WCAG 2.5.3.
 *
 * ```html
 * <button stSeat state="filled" initials="AS" [tone]="1" label="Seat 1, Aarav Shah"></button>
 * ```
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- a seat is a native button
  selector: 'button[stSeat]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-seat',
    type: 'button',
    '[attr.data-state]': 'state()',
    '[attr.data-tone]': 'tone() ?? null',
    '[class.is-placed]': 'justPlaced()',
  },
  template: `
    <span class="initials" aria-hidden="true">{{ state() === 'empty' ? '' : initials().slice(0, 2) }}</span>
    <span class="st-sr-only">{{ label() }}</span>
  `,
  styleUrl: './seat.scss',
})
export class StSeat implements FocusableOption {
  private readonly host = inject<ElementRef<HTMLButtonElement>>(ElementRef);

  readonly state = input<SeatState>('empty');
  readonly initials = input('');
  readonly tone = input<Tone | null>(null);
  readonly justPlaced = input(false, { transform: booleanAttribute });
  /** Required accessible name, e.g. "T3 seat 4, Aarav Shah"; the initials alone are not a name. */
  readonly label = input.required<string>();

  focus(): void {
    this.host.nativeElement.focus();
  }
}
