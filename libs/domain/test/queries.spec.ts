import { describe, expect, it } from 'vitest';
import {
  byId,
  guestAt,
  seatedCount,
  isNearExit,
  occupancy,
  partyOf,
  sameSeat,
  seatPositions,
  seatsAt,
  tableBounds,
  tableOf,
  tableTop,
  unseated,
} from '../src';
import { event, guest, plan, table } from './support/builders';

describe('seat queries', () => {
  const t = table('t1', { seats: 4 });
  const guests = [
    guest('a', { seat: { tableId: 't1', index: 0 } }),
    guest('b', { seat: { tableId: 't1', index: 2 } }),
    guest('c', { seat: { tableId: 't1', index: 9 } }),
    guest('d'),
    guest('e', { rsvp: 'declined' }),
  ];

  it('lays guests out by seat index and ignores seats past capacity', () => {
    expect(seatsAt(t, guests).map((g) => g?.id ?? null)).toEqual(['a', null, 'b', null]);
  });

  it('counts everyone assigned to the table', () => {
    expect(occupancy(t, guests)).toBe(3);
  });

  it('finds the guest in a seat', () => {
    expect(guestAt({ tableId: 't1', index: 2 }, guests)?.id).toBe('b');
    expect(guestAt({ tableId: 't1', index: 1 }, guests)).toBeUndefined();
  });

  it.each([
    [{ tableId: 't1', index: 1 }, { tableId: 't1', index: 1 }, true],
    [{ tableId: 't1', index: 1 }, { tableId: 't2', index: 1 }, false],
    [null, { tableId: 't1', index: 1 }, false],
  ] as const)('sameSeat(%o, %o) is %s', (a, b, expected) => {
    expect(sameSeat(a, b)).toBe(expected);
  });

  it('counts seated guests and indexes by id', () => {
    expect(seatedCount(guests)).toBe(3);
    expect(byId(guests).get('b')?.name).toBe('Guest b');
  });

  it('lists unseated guests who have not declined', () => {
    expect(unseated(guests).map((g) => g.id)).toEqual(['d']);
  });

  it('finds the table a guest sits at', () => {
    expect(tableOf('a', event({ guests }))).toBe('t1');
    expect(tableOf('d', event({ guests }))).toBeNull();
  });
});

describe('partyOf', () => {
  it('returns the whole party, or the guest alone', () => {
    const gs = [guest('a', { partyId: 'p' }), guest('b'), guest('c', { partyId: 'p' })];
    expect(partyOf(gs[0]!, gs).map((g) => g.id)).toEqual(['a', 'c']);
    expect(partyOf(gs[1]!, gs).map((g) => g.id)).toEqual(['b']);
  });
});

describe('geometry', () => {
  it.each([
    ['round', 0, 159.34, 166],
    ['head', 0, 330, 74],
    ['long', 0, 110, 244],
    ['long', 90, 244, 110],
  ] as const)('%s table rotated %i is %i x %i', (shape, rotation, w, h) => {
    const seats = shape === 'round' ? 10 : shape === 'head' ? 8 : 12;
    const b = tableBounds(table('t', { shape, rotation, seats }));
    expect([b.w, b.h]).toEqual([w, h]);
  });

  it.each([
    [1020, 350, true],
    [700, 350, false],
    [900, 80, false],
  ])('a round table at (%i, %i) near the exit: %s', (x, y, expected) => {
    expect(isNearExit(table('t', { x, y }), plan)).toBe(expected);
  });
});

describe('seatPositions', () => {
  it('starts round tables at twelve o clock and goes clockwise', () => {
    const [first, second] = seatPositions('round', 4, 0);
    expect(first).toEqual({ x: 0, y: -68 });
    expect(second).toEqual({ x: 68, y: 0 });
  });

  it('seats one side of a head table, centred', () => {
    expect(seatPositions('head', 3, 0).map((p) => p.x)).toEqual([-40, 0, 40]);
  });

  it('fills one side of a long table, then the other, and turns with rotation', () => {
    expect(seatPositions('long', 4, 0).map((p) => Math.sign(p.x))).toEqual([-1, -1, 1, 1]);
    expect(seatPositions('long', 4, 90).map((p) => Math.sign(p.y))).toEqual([-1, -1, 1, 1]);
  });

  it('gives table tops their designed size', () => {
    expect(tableTop('round', 10, 0)).toEqual({ w: 88, h: 88 });
    expect(tableTop('long', 12, 90)).toEqual({ w: 244, h: 50 });
  });
});
