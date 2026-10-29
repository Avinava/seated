import { FocusKeyManager } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { GEOMETRY, seatPositions, tableTop, type TableShape } from '@seated/domain';
import { StSeat, type SeatView } from '../seat/seat';

const HALF_SEAT = GEOMETRY.seat / 2;

/**
 * A table on the plan: its top (a button that selects the table, showing the
 * short label and an "n/cap" fill count) and its seats placed with the domain
 * geometry around the table's own centre.
 *
 * Seats form one composite widget: a single tab stop, arrow keys move between
 * seats (wrapping, clockwise on round tables), Home and End jump to the ends.
 * Pass `x` and `y` to place the table's centre on a floor; otherwise it sits
 * in flow at its own size. Each seat carries `data-seat-index`, so a drag can
 * hit-test the seat under the pointer.
 *
 * ```html
 * <st-table shape="round" label="T3" [seats]="seatViews()" (seatActivate)="pick($event)" />
 * ```
 */
@Component({
  selector: 'st-table',
  imports: [StSeat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-table',
    role: 'group',
    '[attr.aria-label]': 'groupLabel()',
    '[attr.data-shape]': 'shape()',
    '[class.is-selected]': 'selected()',
    '[class.is-conflict]': 'conflict()',
    '[class.is-placed]': 'x() !== undefined && y() !== undefined',
    '[style.width.px]': 'box().w',
    '[style.height.px]': 'box().h',
    '[style.left.px]': 'x()',
    '[style.top.px]': 'y()',
  },
  templateUrl: './table.html',
  styleUrl: './table.scss',
})
export class StTable {
  private readonly injector = inject(Injector);

  readonly shape = input.required<TableShape>();
  readonly seats = input.required<readonly SeatView[]>();
  /** Short label shown on the table top, e.g. "T3" or "Head". */
  readonly label = input.required<string>();
  readonly rotation = input<0 | 90>(0);
  readonly selected = input(false, { transform: booleanAttribute });
  readonly conflict = input(false, { transform: booleanAttribute });
  /** Accessible name of the group; defaults to "Table <label>". */
  readonly ariaLabel = input<string>();
  /** Centre of the table in plan units, when placed on a floor. */
  readonly x = input<number>();
  readonly y = input<number>();

  /** The table top was activated (click, Enter or Space). */
  readonly tableActivate = output();
  readonly seatActivate = output<number>();
  readonly seatPointerDown = output<{ index: number; event: PointerEvent }>();
  readonly seatPointerEnter = output<number>();
  readonly seatPointerLeave = output<number>();

  private readonly seatRefs = viewChildren(StSeat);
  protected readonly halfSeat = HALF_SEAT;
  /** The seat that holds the roving tab stop. */
  protected readonly activeSeat = signal(0);

  private readonly keys = new FocusKeyManager(this.seatRefs, this.injector).withWrap();

  constructor() {
    const sub = this.keys.change.subscribe((i) => this.activeSeat.set(i));
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      this.keys.destroy();
    });
  }

  protected readonly top = computed(() => tableTop(this.shape(), this.seats().length, this.rotation()));

  protected readonly positions = computed(() => seatPositions(this.shape(), this.seats().length, this.rotation()));

  /** The table's footprint: the top plus the seat ring, centred on the table centre. */
  protected readonly box = computed(() => {
    const top = this.top();
    let halfW = top.w / 2;
    let halfH = top.h / 2;
    for (const p of this.positions()) {
      halfW = Math.max(halfW, Math.abs(p.x) + HALF_SEAT);
      halfH = Math.max(halfH, Math.abs(p.y) + HALF_SEAT);
    }
    return { w: Math.ceil(halfW * 2), h: Math.ceil(halfH * 2), cx: Math.ceil(halfW), cy: Math.ceil(halfH) };
  });

  protected readonly filled = computed(() => this.seats().filter((s) => s.initials.trim() !== '').length);

  protected readonly groupLabel = computed(
    () => this.ariaLabel() ?? $localize`:@@stTable.group:Table ${this.label()}:label:`,
  );

  protected readonly topName = computed(
    () =>
      $localize`:@@stTable.top:${this.label()}:label:, ${this.filled()}:filled: of ${this.seats().length}:capacity: seated`,
  );

  protected onSeatFocus(index: number): void {
    this.keys.updateActiveItem(index);
    this.activeSeat.set(index);
  }

  /**
   * Arrow keys walk the seats in index order (clockwise on round tables), with
   * wrap; Home and End jump to the ends. Matched on `event.key`, since the CDK's
   * own onKeydown still reads the deprecated keyCode.
   */
  protected onSeatKeydown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        this.keys.setNextItemActive();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        this.keys.setPreviousItemActive();
        break;
      case 'Home':
        this.keys.setFirstItemActive();
        break;
      case 'End':
        this.keys.setLastItemActive();
        break;
      default:
        return;
    }
    event.preventDefault();
  }
}
