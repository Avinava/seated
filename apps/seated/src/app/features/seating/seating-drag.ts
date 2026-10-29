import { DOCUMENT } from '@angular/common';
import { DestroyRef, ElementRef, Injectable, inject } from '@angular/core';
import { guestAt, type SeatRef, type TableId } from '@seated/domain';
import { EventStore } from '../../state/event-store';
import { SeatingCommands } from './seating-commands';
import { SeatingStore, type DropTarget } from './seating.store';
import { guestPayload, type Payload } from './seating.vm';

/** Pixels a pointer must travel before a press on a seat becomes a drag. */
const DRAG_THRESHOLD = 5;

/**
 * Pointer drag and drop of guests. Seats are positioned on a plan, not laid
 * out as a list, so the drop target is found by hit-testing the element under
 * the pointer (`data-table-id` on the table, `data-seat-index` on the seat,
 * `data-drop="unseated"` on the list). List rows drag with the CDK (see
 * UnseatedList); seats drag through `seatPointerDown` here. Both end in the
 * same `SeatingCommands.drop`, which is also the keyboard path.
 */
@Injectable()
export class SeatingDrag {
  private readonly document = inject(DOCUMENT);
  private readonly events = inject(EventStore);
  private readonly view = inject(SeatingStore);
  private readonly commands = inject(SeatingCommands);
  private readonly host = inject(ElementRef<HTMLElement>);
  private suppressClick = false;
  private stop: (() => void) | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop?.());
  }

  /** The drop target under a viewport point, if any. */
  hitTest(x: number, y: number): DropTarget | null {
    const el = this.document.elementFromPoint?.(x, y) ?? null;
    return targetOf(el);
  }

  // List drags (CDK)

  listDragStarted(payload: Payload): void {
    this.view.cancel();
    this.view.startDrag(payload);
  }

  listDragMoved(point: { x: number; y: number }): void {
    this.view.setTarget(this.hitTest(point.x, point.y));
  }

  listDragEnded(point: { x: number; y: number }): void {
    const payload = this.view.dragging();
    const target = this.hitTest(point.x, point.y);
    this.view.endDrag();
    if (payload && target?.kind === 'seat') this.commands.drop(payload, target);
  }

  // Seat drags (pointer events from st-table)

  seatPointerDown(seat: SeatRef, event: PointerEvent): void {
    if (event.button !== 0 || this.stop) return;
    const guest = guestAt(seat, this.events.guests());
    if (!guest || this.view.held()) return;
    const start = { x: event.clientX, y: event.clientY };
    let payload: Payload | null = null;

    const move = (e: PointerEvent) => {
      if (!payload) {
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < DRAG_THRESHOLD) return;
        payload = guestPayload(guest);
        this.view.startDrag(payload);
      }
      e.preventDefault();
      this.view.movePointer(e.clientX, e.clientY);
      this.view.setTarget(this.hitTest(e.clientX, e.clientY));
    };
    const up = (e: PointerEvent) => {
      cleanup();
      if (!payload) return;
      const target = this.hitTest(e.clientX, e.clientY);
      this.view.endDrag();
      this.swallowClick();
      if (target) this.commands.drop(payload, target);
    };
    const cancel = () => {
      cleanup();
      if (payload) this.view.endDrag();
    };
    const cleanup = () => {
      this.document.removeEventListener('pointermove', move);
      this.document.removeEventListener('pointerup', up);
      this.document.removeEventListener('pointercancel', cancel);
      this.stop = null;
    };
    this.document.addEventListener('pointermove', move);
    this.document.addEventListener('pointerup', up);
    this.document.addEventListener('pointercancel', cancel);
    this.stop = cancel;
  }

  /** True once after a seat drag, so the click that follows the release is not read as a pick-up. */
  consumeClick(): boolean {
    const swallow = this.suppressClick;
    this.suppressClick = false;
    return swallow;
  }

  private swallowClick(): void {
    this.suppressClick = true;
    setTimeout(() => (this.suppressClick = false));
  }

  // Focus helpers for the palette and the rail

  focusSeat(seat: SeatRef): boolean {
    const el = this.tableEl(seat.tableId)?.querySelector<HTMLElement>(`[data-seat-index="${seat.index}"]`);
    el?.focus();
    return !!el;
  }

  focusTable(tableId: TableId): boolean {
    const el = this.tableEl(tableId)?.querySelector<HTMLElement>('button.top');
    el?.focus();
    return !!el;
  }

  private tableEl(tableId: TableId): HTMLElement | null {
    const root = this.host.nativeElement as HTMLElement;
    return root.querySelector<HTMLElement>(`[data-table-id="${tableId.replace(/["\\]/g, '\\$&')}"]`);
  }
}

/** Resolve an element to a drop target through the data attributes on tables, seats and the list. */
export function targetOf(el: Element | null): DropTarget | null {
  if (!el) return null;
  const seatEl = el.closest<HTMLElement>('[data-seat-index]');
  const tableEl = seatEl?.closest<HTMLElement>('[data-table-id]');
  const index = Number(seatEl?.dataset['seatIndex']);
  const tableId = tableEl?.dataset['tableId'];
  if (tableId && Number.isInteger(index)) return { kind: 'seat', seat: { tableId, index } };
  if (el.closest('[data-drop="unseated"]')) return { kind: 'unseated' };
  return null;
}
