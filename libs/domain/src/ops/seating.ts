import { guestAt } from '../model/queries';
import type { GuestId, SeatRef, SeatingEvent, TableId } from '../model/types';
import { applySeats, findTable, isValidSeat, mapGuests, missingIds, takenSeats, uniqueIds, withSeat } from './internal';
import { invalid, notFound, ok, type OpResult } from './result';

/**
 * Seat a party: the first guest takes `target`, the rest take the nearest free
 * seats clockwise at the same table. Seats held by the guests being moved count
 * as free. A single guest dropped on an occupied seat swaps with its occupant;
 * a group never displaces anyone. All or nothing: no partial seating.
 */
export function seatGuests(event: SeatingEvent, guestIds: readonly GuestId[], target: SeatRef): OpResult {
  const ids = uniqueIds(guestIds);
  if (ids.length === 0) return invalid('guestIds');
  const missing = missingIds(ids, event.guests);
  if (missing.length > 0) return notFound(missing);
  const table = findTable(event, target.tableId);
  if (!table) return notFound([target.tableId]);
  if (!isValidSeat(table, target.index)) return invalid('seat');

  const moving = new Set(ids);
  const occupant = guestAt(target, event.guests);
  if (occupant && !moving.has(occupant.id)) {
    const [only] = ids;
    const mover = event.guests.find((g) => g.id === only);
    if (ids.length !== 1 || !mover) return { ok: false, reason: 'occupied', guestId: occupant.id };
    return ok(
      mapGuests(event, (g) => {
        if (g.id === mover.id) return withSeat(g, target);
        if (g.id === occupant.id) return withSeat(g, mover.seat);
        return g;
      }),
    );
  }

  const taken = takenSeats(event, table, moving);
  const free: number[] = [];
  for (let k = 0; k < table.seats; k++) {
    const index = (target.index + k) % table.seats;
    if (!taken.has(index)) free.push(index);
  }
  if (free.length < ids.length) return { ok: false, reason: 'no-room', free: free.length };
  const plan = new Map<GuestId, SeatRef>(ids.map((id, i) => [id, { tableId: table.id, index: free[i] ?? 0 }]));
  return ok(applySeats(event, plan));
}

export function unseatGuests(event: SeatingEvent, guestIds: readonly GuestId[]): OpResult {
  const missing = missingIds(guestIds, event.guests);
  if (missing.length > 0) return notFound(missing);
  return ok(applySeats(event, new Map(guestIds.map((id) => [id, null]))));
}

/** Swap whoever sits in two seats. Either seat may be empty. */
export function swapSeats(event: SeatingEvent, a: SeatRef, b: SeatRef): OpResult {
  for (const seat of [a, b]) {
    const table = findTable(event, seat.tableId);
    if (!table) return notFound([seat.tableId]);
    if (!isValidSeat(table, seat.index)) return invalid('seat');
  }
  const ga = guestAt(a, event.guests);
  const gb = guestAt(b, event.guests);
  const plan = new Map<GuestId, SeatRef>();
  if (ga) plan.set(ga.id, b);
  if (gb) plan.set(gb.id, a);
  return ok(applySeats(event, plan));
}

/**
 * Put guests at a table, filling its free seats from the lowest index. Guests
 * already at that table keep their seats. Fails if there is not enough room.
 */
export function assignTable(event: SeatingEvent, guestIds: readonly GuestId[], tableId: TableId): OpResult {
  const ids = uniqueIds(guestIds);
  const missing = missingIds(ids, event.guests);
  if (missing.length > 0) return notFound(missing);
  const table = findTable(event, tableId);
  if (!table) return notFound([tableId]);

  const stay = new Set(
    event.guests
      .filter((g) => g.seat?.tableId === tableId && isValidSeat(table, g.seat.index) && ids.includes(g.id))
      .map((g) => g.id),
  );
  const toPlace = ids.filter((id) => !stay.has(id));
  const taken = takenSeats(event, table, new Set(toPlace));
  const free: number[] = [];
  for (let i = 0; i < table.seats; i++) if (!taken.has(i)) free.push(i);
  if (free.length < toPlace.length) return { ok: false, reason: 'no-room', free: free.length };
  return ok(applySeats(event, new Map(toPlace.map((id, i) => [id, { tableId, index: free[i] ?? 0 }]))));
}
