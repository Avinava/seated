import {
  createRng,
  type FloorPlan,
  type Guest,
  type OpResult,
  type Party,
  type Rule,
  type SeatingEvent,
  type Table,
} from '../../src';

export function guest(id: string, over: Partial<Guest> = {}): Guest {
  return {
    id,
    name: `Guest ${id}`,
    email: `${id}@example.com`,
    partyId: null,
    groupId: 'g1',
    rsvp: 'accepted',
    meal: 'veg',
    dietary: '',
    tags: [],
    access: false,
    plusOneOf: null,
    notes: '',
    seat: null,
    ...over,
  };
}

/** A guest sitting at `tableId`, seat `index`. */
export function seated(id: string, tableId: string, index: number, over: Partial<Guest> = {}): Guest {
  return guest(id, { seat: { tableId, index }, ...over });
}

export function table(id: string, over: Partial<Table> = {}): Table {
  return { id, label: id.toUpperCase(), shape: 'round', seats: 10, x: 400, y: 300, rotation: 0, ...over };
}

export function party(id: string, label = `Party ${id}`): Party {
  return { id, label };
}

export const plan: FloorPlan = {
  width: 1180,
  height: 700,
  zones: [{ kind: 'exit', label: 'Exit', x: 1140, y: 300, w: 40, h: 100 }],
};

export function event(over: Partial<SeatingEvent> = {}): SeatingEvent {
  return {
    id: 'e1',
    name: 'Test event',
    kind: 'wedding',
    date: '2026-12-18',
    venue: 'Hall',
    city: 'Pune',
    groups: [{ id: 'g1', label: 'Family', tone: 1 }],
    parties: [],
    guests: [],
    tables: [],
    rules: [],
    plan,
    createdAt: '2026-10-29T00:00:00.000Z',
    updatedAt: '2026-10-29T00:00:00.000Z',
    ...over,
  };
}

/** Unwrap a successful op, failing the test with the reason otherwise. */
export function must<X>(result: OpResult<X>): Extract<OpResult<X>, { ok: true }> {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result)}`);
  return result;
}

export function seatOf(e: SeatingEvent, id: string): string | null {
  const s = e.guests.find((g) => g.id === id)?.seat;
  return s ? `${s.tableId}:${s.index}` : null;
}

/**
 * A random but valid event for property tests: tables (one by the exit), parties
 * of 1 to 4, some guests already seated without conflicts, and a few rules.
 */
export function randomEvent(seed: number): SeatingEvent {
  const rng = createRng(seed);
  const tables: Table[] = [
    table('t1', { x: 1020, y: 350, seats: 8 }),
    table('t2', { x: 700, y: 350, seats: 8 }),
    table('t3', { x: 400, y: 200, seats: 6 }),
    table('t4', { x: 400, y: 500, shape: 'long', seats: 10 }),
  ];
  const groups = [
    { id: 'g1', label: 'A', tone: 1 as const },
    { id: 'g2', label: 'B', tone: 2 as const },
  ];
  const parties: Party[] = [];
  const guests: Guest[] = [];
  const used = new Map(tables.map((t) => [t.id, 0]));
  const partyCount = 6 + rng.int(6);
  for (let p = 0; p < partyCount; p++) {
    const size = 1 + rng.int(4);
    const partyId = size > 1 ? `p${p}` : null;
    if (partyId) parties.push(party(partyId));
    const groupId = rng.pick(['g1', 'g2']);
    const rsvp = rng.weighted({ accepted: 7, pending: 2, declined: 1 });
    const seatHere = rsvp === 'accepted' && rng.chance(0.4) ? rng.pick(tables) : null;
    const room = seatHere ? seatHere.seats - (used.get(seatHere.id) ?? 0) >= size : false;
    for (let m = 0; m < size; m++) {
      const id = `g${p}-${m}`;
      let seat = null;
      if (seatHere && room) {
        const index = used.get(seatHere.id) ?? 0;
        used.set(seatHere.id, index + 1);
        seat = { tableId: seatHere.id, index };
      }
      guests.push(guest(id, { partyId, groupId, rsvp, seat, name: `Guest ${String.fromCharCode(65 + p)}${m}` }));
    }
  }
  const rules: Rule[] = [];
  const ids = guests.map((g) => g.id);
  for (let i = 0; i < 3; i++) {
    const a = rng.pick(ids);
    const b = rng.pick(ids);
    const ga = guests.find((g) => g.id === a);
    const gb = guests.find((g) => g.id === b);
    const bothSeatedTogether = ga?.seat && gb?.seat && ga.seat.tableId === gb.seat.tableId;
    if (a !== b && !bothSeatedTogether) rules.push({ id: `ra${i}`, kind: 'apart', guests: [a, b] });
  }
  const unseatedOne = guests.find((g) => g.seat === null && g.rsvp === 'accepted');
  if (unseatedOne && rng.chance(0.7)) rules.push({ id: 'rx', kind: 'near-exit', guestId: unseatedOne.id });
  for (const p of parties.slice(0, 2)) rules.push({ id: `rt-${p.id}`, kind: 'together', partyId: p.id });
  return event({ groups, parties, guests, tables, rules });
}
