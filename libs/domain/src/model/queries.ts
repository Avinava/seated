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

/** Footprint of a table in plan units, including its seat ring. */
export function tableBounds(table: Table): { x: number; y: number; w: number; h: number } {
  const [w, h] =
    table.shape === 'round'
      ? [168, 168]
      : table.shape === 'head'
        ? [Math.max(120, table.seats * 40 + 10), 100]
        : table.rotation === 90
          ? [Math.max(120, (table.seats / 2) * 40 + 4), 110]
          : [110, Math.max(120, (table.seats / 2) * 40 + 4)];
  return { x: table.x - w / 2, y: table.y - h / 2, w, h };
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
