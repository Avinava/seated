import { GEOMETRY, seatPositions, tableTop } from './geometry';
import type { FloorPlan, Guest, GuestId, SeatRef, SeatingEvent, Table, TableId } from './types';

/** Guests sitting at a table, indexed by seat. Empty seats are null. */
export function seatsAt(table: Table, guests: readonly Guest[]): (Guest | null)[] {
  const seats: (Guest | null)[] = Array.from({ length: table.seats }, () => null);
  for (const g of guests) {
    if (g.seat?.tableId === table.id && g.seat.index < table.seats) seats[g.seat.index] = g;
  }
  return seats;
}

export function occupancy(table: Table, guests: readonly Guest[]): number {
  return guests.filter((g) => g.seat?.tableId === table.id).length;
}

export function guestAt(seat: SeatRef, guests: readonly Guest[]): Guest | undefined {
  return guests.find((g) => g.seat?.tableId === seat.tableId && g.seat.index === seat.index);
}

export function sameSeat(a: SeatRef | null, b: SeatRef | null): boolean {
  return a !== null && b !== null && a.tableId === b.tableId && a.index === b.index;
}

/** Guests who are coming (or might be) and have no seat yet. */
export function unseated(guests: readonly Guest[]): Guest[] {
  return guests.filter((g) => g.seat === null && g.rsvp !== 'declined');
}

export function seatedCount(guests: readonly Guest[]): number {
  return guests.filter((g) => g.seat !== null).length;
}

/** Party members, in list order. A guest without a party is a party of one. */
export function partyOf(guest: Guest, guests: readonly Guest[]): Guest[] {
  return guest.partyId === null ? [guest] : guests.filter((g) => g.partyId === guest.partyId);
}

export function byId<T extends { readonly id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((i) => [i.id, i]));
}

/** Footprint of a table in plan units, including its seats. */
export function tableBounds(table: Table): { x: number; y: number; w: number; h: number } {
  const top = tableTop(table.shape, table.seats, table.rotation);
  const half = GEOMETRY.seat / 2;
  let [x0, y0, x1, y1] = [-top.w / 2, -top.h / 2, top.w / 2, top.h / 2];
  for (const p of seatPositions(table.shape, table.seats, table.rotation)) {
    x0 = Math.min(x0, p.x - half);
    y0 = Math.min(y0, p.y - half);
    x1 = Math.max(x1, p.x + half);
    y1 = Math.max(y1, p.y + half);
  }
  return { x: table.x + x0, y: table.y + y0, w: x1 - x0, h: y1 - y0 };
}

/** Within this distance (plan units, edge to edge) of an exit counts as near the exit. */
export const NEAR_EXIT = 160;

export function isNearExit(table: Table, plan: FloorPlan): boolean {
  const b = tableBounds(table);
  return plan.zones
    .filter((z) => z.kind === 'exit')
    .some((z) => {
      const dx = Math.max(z.x - (b.x + b.w), b.x - (z.x + z.w), 0);
      const dy = Math.max(z.y - (b.y + b.h), b.y - (z.y + z.h), 0);
      return Math.hypot(dx, dy) <= NEAR_EXIT;
    });
}

export function tableOf(guestId: GuestId, event: SeatingEvent): TableId | null {
  return event.guests.find((g) => g.id === guestId)?.seat?.tableId ?? null;
}
