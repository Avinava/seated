import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { isNearExit, type SeatRef, type Table } from '@seated/domain';
import { StFloor, StFloorZone, StIconButton, StTable } from '@seated/kit';
import { EventStore } from '../../state/event-store';
import { SeatingCommands } from './seating-commands';
import { SeatingDrag } from './seating-drag';
import { SeatingStore, ZOOM } from './seating.store';
import { dropPreview, readingOrder, seatKey, seatViews, tableAriaLabel, type SeatContext } from './seating.vm';
import { TableDrag } from './table-drag';

/**
 * The floor plan: zones, tables in reading order (the keyboard order), and
 * the zoom control. Rendered lazily by the page with @defer.
 */
@Component({
  selector: 'st-floor-plan',
  imports: [StFloor, StFloorZone, StTable, StIconButton, TableDrag],
  templateUrl: './floor-plan.html',
  styleUrl: './floor-plan.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlan {
  protected readonly events = inject(EventStore);
  protected readonly view = inject(SeatingStore);
  private readonly commands = inject(SeatingCommands);
  private readonly drag = inject(SeatingDrag);
  private readonly floorEl = viewChild.required(StFloor, { read: ElementRef });

  protected readonly zoom = ZOOM;
  protected readonly plan = computed(() => this.events.doc()?.plan ?? { width: 1180, height: 700, zones: [] });
  protected readonly percent = computed(() => `${Math.round(this.view.effectiveZoom() * 100)}%`);
  protected readonly floorLabel = computed(() => {
    const venue = this.events.doc()?.venue;
    return venue
      ? $localize`:@@floor.labelVenue:Floor plan, ${venue}:venue:. Tables are in reading order; arrow keys move between seats.`
      : $localize`:@@floor.label:Floor plan. Tables are in reading order; arrow keys move between seats.`;
  });

  /** Where the held or dragged guests would land on the seat under the pointer or focus. */
  private readonly preview = computed(() => {
    const doc = this.events.doc();
    const payload = this.view.payload();
    const target = this.view.targetSeat();
    if (!doc || !payload || !target) return new Set<string>();
    const p = dropPreview(doc, payload, target);
    return new Set(p.ok ? p.seats.map(seatKey) : [seatKey(target)]);
  });

  private readonly context = computed<SeatContext>(() => ({
    colorBy: this.view.colorBy(),
    groups: this.events.groupsById(),
    conflicts: new Set(this.events.report()?.conflictsByGuest.keys() ?? []),
    held: this.view.heldIds(),
    preview: this.preview(),
    justPlaced: this.view.justPlacedSet(),
    highlight: this.view.highlightSet(),
  }));

  protected readonly tables = computed(() => {
    const doc = this.events.doc();
    if (!doc) return [];
    const ctx = this.context();
    const report = this.events.report();
    const selected = this.view.selectedTableId();
    return readingOrder(doc.tables).map((table) => {
      const seats = seatViews(table, doc.guests, ctx);
      const conflicts = report?.conflictsByTable.get(table.id)?.length ?? 0;
      const filled = seats.filter((s) => s.initials !== '').length;
      return {
        table,
        seats,
        conflict: conflicts > 0,
        selected: table.id === selected,
        ariaLabel: tableAriaLabel(table, filled, conflicts, isNearExit(table, doc.plan)),
      };
    });
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.floorEl().nativeElement as HTMLElement;
      const measure = () => this.view.setViewport(el.clientWidth, el.clientHeight);
      measure();
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        destroyRef.onDestroy(() => ro.disconnect());
      }
      // Ctrl or Cmd with the wheel (and trackpad pinch) zooms the plan instead of the page.
      const wheel = (e: WheelEvent) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        this.view.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
      };
      el.addEventListener('wheel', wheel, { passive: false });
      destroyRef.onDestroy(() => el.removeEventListener('wheel', wheel));
    });
  }

  protected selectTable(table: Table): void {
    this.view.select(this.view.selectedTableId() === table.id ? null : table.id);
  }

  protected activateSeat(table: Table, index: number): void {
    if (this.drag.consumeClick()) return;
    this.commands.activateSeat({ tableId: table.id, index });
  }

  protected seatPointerDown(table: Table, { index, event }: { index: number; event: PointerEvent }): void {
    this.drag.seatPointerDown({ tableId: table.id, index }, event);
  }

  /** Hovering a seat while holding someone previews the drop, as focus does for the keyboard. */
  protected seatEnter(table: Table, index: number): void {
    if (this.view.held() && !this.view.dragging())
      this.view.setTarget({ kind: 'seat', seat: { tableId: table.id, index } });
  }

  protected seatLeave(): void {
    if (this.view.held() && !this.view.dragging()) this.view.setTarget(null);
  }

  protected onFocusIn(table: Table, event: FocusEvent): void {
    const seat = seatOf(table, event.target);
    if (seat && this.view.held()) this.view.setTarget({ kind: 'seat', seat });
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Element | null;
    if (this.view.held() && !this.view.dragging() && !next?.closest('[data-seat-index]')) this.view.setTarget(null);
  }

  /**
   * Keys on a table: Delete or Backspace on a seat unseats its guest; on the
   * table top, arrows nudge it (Shift for ten times as far) and Delete removes it.
   */
  protected onKeydown(table: Table, event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const seat = seatOf(table, target);
    if (seat) {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        this.commands.unseatAt(seat);
      }
      return;
    }
    if (!target.classList.contains('top') || event.altKey || event.ctrlKey || event.metaKey) return;
    const step = event.shiftKey ? 100 : 10;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      this.commands.nudge(table.id, move[0], move[1]);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.commands.removeTable(table.id);
    }
  }

  protected tableMoved(table: Table, { dx, dy }: { dx: number; dy: number }): void {
    this.commands.moveTable(table.id, table.x + dx, table.y + dy);
  }
}

function seatOf(table: Table, target: EventTarget | null): SeatRef | null {
  if (!(target instanceof HTMLElement) || target.dataset['seatIndex'] === undefined) return null;
  return { tableId: table.id, index: Number(target.dataset['seatIndex']) };
}
