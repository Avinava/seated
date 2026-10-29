import type { Guest, GuestId, SeatRef, SeatingEvent, Table } from '../model/types';

/** Replace guests through `fn`, keeping the original array when nothing changed. */
export function mapGuests(event: SeatingEvent, fn: (g: Guest) => Guest): SeatingEvent {
  let changed = false;
  const guests = event.guests.map((g) => {
    const next = fn(g);
    if (next !== g) changed = true;
    return next;
  });
  return changed ? { ...event, guests } : event;
}

export function withSeat(g: Guest, seat: SeatRef | null): Guest {
  if (seat === g.seat || (seat && g.seat && seat.tableId === g.seat.tableId && seat.index === g.seat.index)) return g;
  return { ...g, seat };
}

/** Apply a seat plan (guest id to seat, or null to unseat). */
export function applySeats(event: SeatingEvent, plan: ReadonlyMap<GuestId, SeatRef | null>): SeatingEvent {
  return mapGuests(event, (g) => (plan.has(g.id) ? withSeat(g, plan.get(g.id) ?? null) : g));
}

export function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

export function missingIds(ids: readonly string[], items: readonly { readonly id: string }[]): string[] {
  const known = new Set(items.map((i) => i.id));
  return ids.filter((id) => !known.has(id));
}

export function findTable(event: SeatingEvent, tableId: string): Table | undefined {
  return event.tables.find((t) => t.id === tableId);
}

export function isValidSeat(table: Table, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < table.seats;
}

/** Seat indices at `table` held by guests other than those in `ignore`. */
export function takenSeats(event: SeatingEvent, table: Table, ignore: ReadonlySet<GuestId> = new Set()): Set<number> {
  const taken = new Set<number>();
  for (const g of event.guests) {
    if (g.seat?.tableId === table.id && !ignore.has(g.id)) taken.add(g.seat.index);
  }
  return taken;
}
