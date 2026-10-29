import { describe, expect, it } from 'vitest';
import { autoSeat, createSampleWedding, evaluate, type Explanation, type SeatingEvent } from '../src';
import { event, guest, party, randomEvent, seatOf, seated, table } from './support/builders';

function conflictIds(e: SeatingEvent): Set<string> {
  return new Set(evaluate(e).conflicts.map((c) => c.rule.id));
}

function codes(xs: readonly Explanation[]): string[] {
  return xs.map((x) => (x.code === 'needs-you' ? `needs-you:${x.reason}` : x.code));
}

function invariants(before: SeatingEvent, after: SeatingEvent, placed: readonly string[]): void {
  // Nobody who already had a seat moves.
  for (const g of before.guests) {
    if (g.seat) expect(after.guests.find((x) => x.id === g.id)?.seat, g.id).toEqual(g.seat);
  }
  // No new conflicts.
  const old = conflictIds(before);
  for (const id of conflictIds(after)) expect(old.has(id), `new conflict ${id}`).toBe(true);
  // Parties placed in this run are never split.
  for (const p of before.parties) {
    const placedHere = after.guests.filter((g) => g.partyId === p.id && placed.includes(g.id));
    if (placedHere.length === 0) continue;
    const tables = new Set(after.guests.filter((g) => g.partyId === p.id && g.seat).map((g) => g.seat?.tableId));
    const wasSplit =
      new Set(before.guests.filter((g) => g.partyId === p.id && g.seat).map((g) => g.seat?.tableId)).size > 1;
    if (!wasSplit) expect(tables.size, p.id).toBe(1);
  }
  // Only accepted (or pending) guests who were unseated get placed.
  for (const id of placed) {
    const g = before.guests.find((x) => x.id === id);
    expect(g?.seat).toBeNull();
    expect(g?.rsvp).not.toBe('declined');
  }
}

describe('autoSeat properties', () => {
  const seeds = Array.from({ length: 40 }, (_, i) => i + 1);

  it.each(seeds)('random event %i: no new conflicts, parties whole, seated guests untouched, deterministic', (seed) => {
    const before = randomEvent(seed);
    for (const includePending of [false, true]) {
      const r = autoSeat(before, { includePending });
      invariants(before, r.event, r.placed);
      expect(autoSeat(before, { includePending })).toEqual(r);
    }
  });

  it.each([1, 2, 3, 7, 42])('sample wedding seed %i', (seed) => {
    const before = createSampleWedding(new Date('2026-10-29T00:00:00Z'), seed);
    const r = autoSeat(before);
    invariants(before, r.event, r.placed);
    expect(r.placed).toHaveLength(16);
    expect([...conflictIds(r.event)]).toEqual(['r-1']);
    const withPending = autoSeat(before, { includePending: true });
    invariants(before, withPending.event, withPending.placed);
  });

  it('never seats declined guests or pending ones unless asked', () => {
    const e = event({
      tables: [table('t1')],
      guests: [guest('a', { rsvp: 'declined' }), guest('b', { rsvp: 'pending' })],
    });
    expect(autoSeat(e).placed).toEqual([]);
    expect(autoSeat(e).event).toBe(e);
    expect(autoSeat(e, { includePending: true }).placed).toEqual(['b']);
  });
});

describe('autoSeat choices', () => {
  it('seats a needs-exit guest by the exit and says so', () => {
    const e = event({
      tables: [table('far', { x: 400, y: 300 }), table('near', { x: 1020, y: 350, label: 'Exit table' })],
      guests: [guest('a', { name: 'Asha', access: true })],
    });
    const r = autoSeat(e);
    expect(seatOf(r.event, 'a')).toMatch(/^near:/);
    expect(r.explanation).toEqual([
      { code: 'placed-guest', name: 'Asha', tableLabel: 'Exit table' },
      { code: 'placed-near-exit', name: 'Asha', tableLabel: 'Exit table' },
    ]);
  });

  it('places tight parties first, prefers their group, keeps them contiguous', () => {
    const e = event({
      groups: [
        { id: 'g1', label: 'A', tone: 1 },
        { id: 'g2', label: 'B', tone: 2 },
      ],
      tables: [table('t1', { seats: 6 }), table('t2', { seats: 6 })],
      parties: [party('p1', 'The Raos')],
      guests: [
        seated('s', 't2', 0, { groupId: 'g2' }),
        guest('a', { partyId: 'p1', groupId: 'g2' }),
        guest('b', { partyId: 'p1', groupId: 'g2' }),
        guest('c', { partyId: 'p1', groupId: 'g2' }),
      ],
    });
    const r = autoSeat(e);
    expect(['a', 'b', 'c'].map((id) => seatOf(r.event, id))).toEqual(['t2:1', 't2:2', 't2:3']);
    expect(r.explanation).toEqual([{ code: 'placed-party', partyLabel: 'The Raos', count: 3, tableLabel: 'T2' }]);
  });

  it('prefers the emptiest table, and leaves the head table for last', () => {
    const e = event({
      tables: [table('h', { shape: 'head', seats: 8 }), table('t1', { seats: 4 }), table('t2', { seats: 6 })],
      guests: [guest('a')],
    });
    expect(seatOf(autoSeat(e).event, 'a')).toBe('t2:0');
  });

  it('joins unseated party members to the table their party already holds', () => {
    const e = event({
      tables: [table('t1', { seats: 4 }), table('t2', { seats: 10 })],
      parties: [party('p1')],
      guests: [seated('a', 't1', 0, { partyId: 'p1' }), guest('b', { partyId: 'p1' })],
    });
    expect(seatOf(autoSeat(e).event, 'b')).toBe('t1:1');
  });

  it('keeps apart rules and explains the table it avoided', () => {
    const e = event({
      tables: [table('t1', { seats: 10 }), table('t2', { seats: 4 })],
      guests: [seated('a', 't1', 0, { name: 'Asha' }), guest('b', { name: 'Bina' })],
      rules: [{ id: 'r', kind: 'apart', guests: ['a', 'b'] }],
    });
    const r = autoSeat(e);
    expect(seatOf(r.event, 'b')).toBe('t2:0');
    expect(r.explanation).toContainEqual({ code: 'kept-apart', names: ['Bina', 'Asha'] });
  });

  it('fills a gap when no contiguous run is free', () => {
    const e = event({
      tables: [table('t1', { seats: 4 })],
      parties: [party('p1')],
      guests: [
        seated('x', 't1', 0),
        seated('y', 't1', 2),
        guest('a', { partyId: 'p1' }),
        guest('b', { partyId: 'p1' }),
      ],
    });
    expect(['a', 'b'].map((id) => seatOf(autoSeat(e).event, id))).toEqual(['t1:1', 't1:3']);
  });

  it('adds nobody to a table that is already over capacity', () => {
    const e = event({
      tables: [table('t1', { seats: 2 })],
      guests: [seated('x', 't1', 0), seated('y', 't1', 0), guest('a')],
    });
    expect(autoSeat(e).placed).toEqual([]);
  });

  it('makes room for a party by moving a single it just placed', () => {
    // Bina needs the exit, so she goes first and takes the roomiest table (n1).
    // The Raos then fit nowhere until she moves to the other exit table.
    const e = event({
      tables: [
        table('n1', { x: 1020, y: 350, seats: 4 }),
        table('n2', { x: 1020, y: 150, seats: 2 }),
        table('far', { x: 400, y: 300, seats: 2 }),
      ],
      parties: [party('p1', 'The Raos')],
      guests: [
        guest('a', { partyId: 'p1' }),
        guest('b', { partyId: 'p1' }),
        guest('c', { partyId: 'p1' }),
        guest('d', { partyId: 'p1' }),
        guest('s', { name: 'Bina', access: true }),
      ],
    });
    const r = autoSeat(e);
    expect(r.placed).toHaveLength(5);
    expect(new Set(['a', 'b', 'c', 'd'].map((id) => seatOf(r.event, id)?.split(':')[0]))).toEqual(new Set(['n1']));
    expect(seatOf(r.event, 's')).toBe('n2:0');
    expect(r.explanation).toContainEqual({
      code: 'made-room',
      names: ['Bina'],
      forLabel: 'The Raos',
      tableLabel: 'N1',
    });
    expect(r.explanation).toContainEqual({ code: 'placed-near-exit', name: 'Bina', tableLabel: 'N2' });
    invariants(e, r.event, r.placed);
  });

  it('puts a single back when it cannot be moved anywhere', () => {
    const e = event({
      tables: [table('n1', { x: 1020, y: 350, seats: 4 }), table('far', { x: 400, y: 300, seats: 2 })],
      parties: [party('p1', 'The Raos')],
      guests: [
        guest('a', { partyId: 'p1' }),
        guest('b', { partyId: 'p1' }),
        guest('c', { partyId: 'p1' }),
        guest('d', { partyId: 'p1' }),
        guest('s', { name: 'Bina', access: true }),
      ],
    });
    const r = autoSeat(e);
    expect(seatOf(r.event, 's')).toBe('n1:0');
    expect(codes(r.explanation)).toContain('needs-you:no-room-for-party');
  });

  it.each<[string, Partial<SeatingEvent>, string]>([
    [
      'apart rule inside a party',
      {
        tables: [table('t1')],
        parties: [party('p1')],
        guests: [guest('a', { partyId: 'p1' }), guest('b', { partyId: 'p1' })],
        rules: [{ id: 'r', kind: 'apart', guests: ['a', 'b'] }],
      },
      'needs-you:apart-in-party',
    ],
    [
      'no near-exit seat',
      { tables: [table('t1', { x: 400 })], guests: [guest('a', { access: true })] },
      'needs-you:no-seat-near-exit',
    ],
    [
      'party table full',
      {
        tables: [table('t1', { seats: 1 }), table('t2')],
        parties: [party('p1')],
        guests: [seated('a', 't1', 0, { partyId: 'p1' }), guest('b', { partyId: 'p1' })],
      },
      'needs-you:party-table-full',
    ],
    [
      'apart blocks every table with room',
      {
        tables: [table('t1')],
        guests: [seated('a', 't1', 0), guest('b')],
        rules: [{ id: 'r', kind: 'apart', guests: ['a', 'b'] }],
      },
      'needs-you:apart-blocks-all',
    ],
    [
      'no room for a party',
      {
        tables: [table('t1', { seats: 2 }), table('t2', { seats: 2 })],
        parties: [party('p1')],
        guests: [guest('a', { partyId: 'p1' }), guest('b', { partyId: 'p1' }), guest('c', { partyId: 'p1' })],
      },
      'needs-you:no-room-for-party',
    ],
    [
      'no room for one',
      { tables: [table('t1', { seats: 1 })], guests: [seated('x', 't1', 0), guest('a')] },
      'needs-you:no-room',
    ],
  ])('explains: %s', (_, over, code) => {
    const r = autoSeat(event(over));
    expect(codes(r.explanation)).toContain(code);
  });

  it('labels a needs-you party by its party label', () => {
    const r = autoSeat(
      event({
        tables: [table('t1', { seats: 1 })],
        parties: [party('p1', 'The Raos')],
        guests: [guest('a', { partyId: 'p1', name: 'A' }), guest('b', { partyId: 'p1', name: 'B' })],
      }),
    );
    expect(r.explanation).toEqual([
      { code: 'needs-you', reason: 'no-room-for-party', names: ['A', 'B'], partyLabel: 'The Raos' },
    ]);
  });
});
