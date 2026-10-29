import { isNearExit } from '../model/queries';
import type { Guest, GuestId, PartyId, SeatRef, SeatingEvent, Table, TableId } from '../model/types';

export interface AutoSeatOptions {
  /** Also seat guests who have not replied yet. Default false. */
  readonly includePending?: boolean;
}

export type NeedsYouReason =
  'no-room-for-party' | 'no-room' | 'no-seat-near-exit' | 'party-table-full' | 'apart-in-party' | 'apart-blocks-all';

/** Structured notes on what the solver did; the app phrases them. */
export type Explanation =
  | { readonly code: 'placed-party'; readonly partyLabel: string; readonly count: number; readonly tableLabel: string }
  | { readonly code: 'placed-guest'; readonly name: string; readonly tableLabel: string }
  | { readonly code: 'placed-near-exit'; readonly name: string; readonly tableLabel: string }
  | { readonly code: 'kept-apart'; readonly names: readonly [string, string] }
  | {
      readonly code: 'made-room';
      readonly names: readonly string[];
      readonly forLabel: string;
      readonly tableLabel: string;
    }
  | {
      readonly code: 'needs-you';
      readonly reason: NeedsYouReason;
      readonly names: readonly string[];
      readonly partyLabel?: string;
    };

export interface AutoSeatResult {
  readonly event: SeatingEvent;
  /** Guests given a seat, in the order they were placed. */
  readonly placed: readonly GuestId[];
  readonly explanation: readonly Explanation[];
}

interface Unit {
  readonly key: string;
  readonly partyId: PartyId | null;
  readonly label: string;
  readonly members: readonly Guest[];
  readonly needsExit: boolean;
  readonly groupId: string;
  /** Tables where already-seated party members sit; the unit must join them. */
  readonly anchors: readonly TableId[];
}

/** Mutable working state, private to one solver run. */
class Board {
  readonly seats = new Map<TableId, (GuestId | null)[]>();
  readonly at = new Map<TableId, Set<GuestId>>();
  readonly seatOf = new Map<GuestId, SeatRef>();

  constructor(tables: readonly Table[], guests: readonly Guest[]) {
    for (const t of tables) {
      this.seats.set(
        t.id,
        Array.from({ length: t.seats }, () => null),
      );
      this.at.set(t.id, new Set());
    }
    for (const g of guests) {
      if (!g.seat) continue;
      this.at.get(g.seat.tableId)?.add(g.id);
      const row = this.seats.get(g.seat.tableId);
      if (row && g.seat.index >= 0 && g.seat.index < row.length) row[g.seat.index] = g.id;
    }
  }

  /**
   * Free seat indices, never more than the table's spare capacity, so a table
   * that is already over (two guests on one seat, or seat numbers past the end)
   * gets no more.
   */
  free(tableId: TableId): number[] {
    const row = this.seats.get(tableId) ?? [];
    const spare = Math.max(0, row.length - (this.at.get(tableId)?.size ?? 0));
    const out: number[] = [];
    row.forEach((s, i) => {
      if (s === null) out.push(i);
    });
    return out.slice(0, spare);
  }

  /** A contiguous clockwise run of `n` free seats if there is one, else the first `n` free seats. */
  pick(tableId: TableId, n: number): number[] {
    const row = this.seats.get(tableId) ?? [];
    const size = row.length;
    for (let start = 0; start < size; start++) {
      const run = Array.from({ length: n }, (_, k) => (start + k) % size);
      if (n <= size && run.every((i) => row[i] === null)) return run;
    }
    return this.free(tableId).slice(0, n);
  }

  place(guestId: GuestId, tableId: TableId, index: number): void {
    const row = this.seats.get(tableId);
    if (row) row[index] = guestId;
    this.at.get(tableId)?.add(guestId);
    this.seatOf.set(guestId, { tableId, index });
  }

  remove(guestId: GuestId): void {
    const seat = this.seatOf.get(guestId);
    if (!seat) return;
    const row = this.seats.get(seat.tableId);
    if (row) row[seat.index] = null;
    this.at.get(seat.tableId)?.delete(guestId);
    this.seatOf.delete(guestId);
  }
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Party-aware greedy seating. Deterministic, and never moves anyone who already
 * has a seat. It seats whole parties at one table and never creates an apart,
 * near-exit or capacity conflict; anything it cannot place is explained.
 */
export function autoSeat(event: SeatingEvent, options: AutoSeatOptions = {}): AutoSeatResult {
  const byId = new Map(event.guests.map((g) => [g.id, g]));
  const partyLabel = new Map(event.parties.map((p) => [p.id, p.label]));
  const tableById = new Map(event.tables.map((t) => [t.id, t]));
  const tableOrder = new Map(event.tables.map((t, i) => [t.id, i]));
  const nearExit = new Map(event.tables.map((t) => [t.id, isNearExit(t, event.plan)]));
  const board = new Board(event.tables, event.guests);

  const partners = new Map<GuestId, GuestId[]>();
  const needsExit = new Set<GuestId>(event.guests.filter((g) => g.access).map((g) => g.id));
  for (const r of event.rules) {
    if (r.kind === 'near-exit') needsExit.add(r.guestId);
    if (r.kind === 'apart') {
      const [a, b] = r.guests;
      partners.set(a, [...(partners.get(a) ?? []), b]);
      partners.set(b, [...(partners.get(b) ?? []), a]);
    }
  }

  const wanted = (g: Guest): boolean =>
    g.seat === null && (g.rsvp === 'accepted' || (options.includePending === true && g.rsvp === 'pending'));
  const units = buildUnits(event, wanted, needsExit, partyLabel, tableOrder);

  const label = (id: TableId): string => tableById.get(id)?.label ?? id;
  const nameOf = (id: GuestId): string => byId.get(id)?.name ?? id;
  const keptApart = new Map<string, readonly [string, string]>();
  const madeRoom: Explanation[] = [];
  const needsYou: Explanation[] = [];
  const placedUnits: Unit[] = [];

  /** Partners of `members` sitting at `tableId`, as [member, partner] pairs. */
  const apartHits = (members: readonly Guest[], tableId: TableId): [GuestId, GuestId][] => {
    const here = board.at.get(tableId) ?? new Set<GuestId>();
    return members.flatMap((m) =>
      (partners.get(m.id) ?? []).filter((p) => here.has(p)).map((p): [GuestId, GuestId] => [m.id, p]),
    );
  };

  const fits = (members: readonly Guest[], exit: boolean, tableId: TableId): boolean =>
    (!exit || nearExit.get(tableId) === true) &&
    apartHits(members, tableId).length === 0 &&
    board.free(tableId).length >= members.length;

  const rank = (unit: Unit, tableIds: readonly TableId[]): TableId[] => {
    const sameGroup = (t: TableId): number =>
      [...(board.at.get(t) ?? [])].filter((id) => byId.get(id)?.groupId === unit.groupId).length;
    const key = (t: TableId) => ({
      head: tableById.get(t)?.shape === 'head' ? 1 : 0,
      group: sameGroup(t),
      free: board.free(t).length,
      order: tableOrder.get(t) ?? 0,
    });
    return [...tableIds].sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      return ka.head - kb.head || kb.group - ka.group || kb.free - ka.free || ka.order - kb.order;
    });
  };

  const seatUnit = (unit: Unit, tableId: TableId): void => {
    const indices = board.pick(tableId, unit.members.length);
    unit.members.forEach((m, i) => board.place(m.id, tableId, indices[i] ?? 0));
    placedUnits.push(unit);
  };

  const blocked: Unit[] = [];
  for (const unit of units) {
    const ids = new Set(unit.members.map((m) => m.id));
    const inner = unit.members.find((m) => (partners.get(m.id) ?? []).some((p) => ids.has(p)));
    if (inner) {
      needsYou.push(needs(unit, 'apart-in-party'));
      continue;
    }
    const pool = unit.anchors.length > 0 ? unit.anchors : event.tables.map((t) => t.id);
    const ok = rank(
      unit,
      pool.filter((t) => fits(unit.members, unit.needsExit, t)),
    );
    const [best] = ok;
    if (best !== undefined) {
      noteApart(unit, pool, best);
      seatUnit(unit, best);
    } else {
      blocked.push(unit);
    }
  }

  // Repair: move singles placed in this run to make room for a blocked party. Bounded by units x tables.
  for (const unit of blocked) {
    if (unit.members.length < 2 || !repair(unit)) {
      needsYou.push(needs(unit, reasonFor(unit)));
    }
  }

  function repair(unit: Unit): boolean {
    const pool = unit.anchors.length > 0 ? unit.anchors : event.tables.map((t) => t.id);
    for (const t of rank(unit, pool)) {
      if (unit.needsExit && nearExit.get(t) !== true) continue;
      if (apartHits(unit.members, t).length > 0) continue;
      const deficit = unit.members.length - board.free(t).length;
      const movable = placedUnits
        .filter((u) => u.members.length === 1 && u.anchors.length === 0)
        .map((u) => u.members[0])
        .filter((m): m is Guest => m !== undefined && board.seatOf.get(m.id)?.tableId === t)
        .reverse();
      if (movable.length < deficit) continue;
      const moved: { guest: Guest; from: SeatRef }[] = [];
      for (const guest of movable.slice(0, deficit)) {
        const from = board.seatOf.get(guest.id);
        if (!from) break;
        board.remove(guest.id);
        const exit = needsExit.has(guest.id);
        const [dest] = rank(
          { ...unit, members: [guest], groupId: guest.groupId },
          event.tables.map((x) => x.id).filter((x) => x !== t && fits([guest], exit, x)),
        );
        if (dest === undefined) {
          board.place(guest.id, from.tableId, from.index);
          break;
        }
        board.place(guest.id, dest, board.pick(dest, 1)[0] ?? 0);
        moved.push({ guest, from });
      }
      if (moved.length === deficit && fits(unit.members, unit.needsExit, t)) {
        seatUnit(unit, t);
        madeRoom.push({
          code: 'made-room',
          names: moved.map((m) => m.guest.name),
          forLabel: unit.label,
          tableLabel: label(t),
        });
        return true;
      }
      for (const m of moved.reverse()) {
        board.remove(m.guest.id);
        board.place(m.guest.id, m.from.tableId, m.from.index);
      }
    }
    return false;
  }

  function reasonFor(unit: Unit): NeedsYouReason {
    if (unit.anchors.length > 0) return 'party-table-full';
    const all = event.tables.map((t) => t.id);
    const roomy = all.filter((t) => board.free(t).length >= unit.members.length);
    if (unit.needsExit && !roomy.some((t) => nearExit.get(t) === true)) return 'no-seat-near-exit';
    if (roomy.length > 0) return 'apart-blocks-all';
    return unit.members.length > 1 ? 'no-room-for-party' : 'no-room';
  }

  function needs(unit: Unit, reason: NeedsYouReason): Explanation {
    const names = unit.members.map((m) => m.name);
    return unit.partyId === null
      ? { code: 'needs-you', reason, names }
      : { code: 'needs-you', reason, names, partyLabel: unit.label };
  }

  /** Record apart rules that ruled out a table this unit would otherwise have taken. */
  function noteApart(unit: Unit, pool: readonly TableId[], chosen: TableId): void {
    for (const t of pool) {
      if (t === chosen || board.free(t).length < unit.members.length) continue;
      if (unit.needsExit && nearExit.get(t) !== true) continue;
      for (const [a, b] of apartHits(unit.members, t)) {
        const key = [a, b].sort(compare).join('|');
        if (!keptApart.has(key)) keptApart.set(key, [nameOf(a), nameOf(b)]);
      }
    }
  }

  // Build the result from the final board.
  const seats = new Map<GuestId, SeatRef>();
  const placed: GuestId[] = [];
  const placements: Explanation[] = [];
  for (const unit of placedUnits) {
    const first = unit.members[0];
    const tableId = first ? board.seatOf.get(first.id)?.tableId : undefined;
    if (tableId === undefined) continue;
    for (const m of unit.members) {
      const seat = board.seatOf.get(m.id);
      if (seat) seats.set(m.id, seat);
      placed.push(m.id);
    }
    const tableLabel = label(tableId);
    placements.push(
      unit.partyId === null
        ? { code: 'placed-guest', name: unit.label, tableLabel }
        : { code: 'placed-party', partyLabel: unit.label, count: unit.members.length, tableLabel },
    );
    for (const m of unit.members) {
      if (needsExit.has(m.id)) placements.push({ code: 'placed-near-exit', name: m.name, tableLabel });
    }
  }

  const guests = event.guests.map((g) => {
    const seat = seats.get(g.id);
    return seat ? { ...g, seat } : g;
  });
  const keptApartNotes: Explanation[] = [...keptApart.values()].map((names) => ({ code: 'kept-apart', names }));
  return {
    event: placed.length > 0 ? { ...event, guests } : event,
    placed,
    explanation: [...placements, ...keptApartNotes, ...madeRoom, ...needsYou],
  };
}

function buildUnits(
  event: SeatingEvent,
  wanted: (g: Guest) => boolean,
  needsExit: ReadonlySet<GuestId>,
  partyLabel: ReadonlyMap<PartyId, string>,
  tableOrder: ReadonlyMap<TableId, number>,
): Unit[] {
  const groups = new Map<string, Guest[]>();
  for (const g of event.guests) {
    if (!wanted(g)) continue;
    const key = g.partyId === null ? `guest:${g.id}` : `party:${g.partyId}`;
    groups.set(key, [...(groups.get(key) ?? []), g]);
  }
  const units: Unit[] = [];
  for (const [key, members] of groups) {
    const [first] = members;
    if (!first) continue;
    const partyId = first.partyId;
    const anchorCounts = new Map<TableId, number>();
    if (partyId !== null) {
      for (const g of event.guests) {
        if (g.partyId === partyId && g.seat && tableOrder.has(g.seat.tableId)) {
          anchorCounts.set(g.seat.tableId, (anchorCounts.get(g.seat.tableId) ?? 0) + 1);
        }
      }
    }
    const anchors = [...anchorCounts.entries()]
      .sort((a, b) => b[1] - a[1] || (tableOrder.get(a[0]) ?? 0) - (tableOrder.get(b[0]) ?? 0))
      .map(([t]) => t);
    units.push({
      key,
      partyId,
      label: partyId === null ? first.name : (partyLabel.get(partyId) ?? first.name),
      members,
      needsExit: members.some((m) => needsExit.has(m.id)),
      groupId: mostCommon(members.map((m) => m.groupId)),
      anchors,
    });
  }
  // Tightest first: near-exit needs, then bigger parties, then by label.
  return units.sort(
    (a, b) =>
      Number(b.needsExit) - Number(a.needsExit) ||
      b.members.length - a.members.length ||
      compare(a.label, b.label) ||
      compare(a.key, b.key),
  );
}

function mostCommon(values: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0] ?? '';
  for (const [v, n] of counts) if (n > (counts.get(best) ?? 0)) best = v;
  return best;
}
