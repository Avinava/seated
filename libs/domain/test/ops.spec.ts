import { describe, expect, it } from 'vitest';
import {
  addGuest,
  addRule,
  addTable,
  addTag,
  assignTable,
  moveTable,
  nextId,
  nextIdFor,
  nextTableLabel,
  removeGuests,
  removeRule,
  removeTable,
  removeTag,
  renameTable,
  resizeTable,
  rotateTable,
  seatGuests,
  setAccess,
  setRsvp,
  swapSeats,
  touch,
  unseatGuests,
  updateGuest,
  type OpResult,
  type SeatingEvent,
} from '../src';
import { event, guest, must, party, seatOf, seated, table } from './support/builders';

const base = event({
  tables: [table('t1', { seats: 4 }), table('t2', { seats: 2 })],
  parties: [party('p1', 'The Raos'), party('p2', 'The Nairs')],
  guests: [
    seated('a', 't1', 0),
    seated('b', 't1', 1),
    guest('c', { partyId: 'p1' }),
    guest('d', { partyId: 'p1' }),
    guest('e'),
    seated('f', 't2', 0, { partyId: 'p2' }),
    seated('x', 't2', 1),
  ],
  rules: [
    { id: 'r-1', kind: 'apart', guests: ['a', 'e'] },
    { id: 'r-2', kind: 'together', partyId: 'p2' },
    { id: 'r-3', kind: 'near-exit', guestId: 'f' },
  ],
});

function failure(result: OpResult<unknown>): unknown {
  return result.ok ? 'ok' : result;
}

describe('seatGuests', () => {
  it.each<[string, string[], { tableId: string; index: number }, Record<string, string | null>]>([
    ['seats one guest on an empty seat', ['e'], { tableId: 't1', index: 2 }, { e: 't1:2' }],
    ['seats a party clockwise from the target', ['c', 'd'], { tableId: 't1', index: 2 }, { c: 't1:2', d: 't1:3' }],
    ['wraps round the table', ['c', 'd'], { tableId: 't1', index: 3 }, { c: 't1:3', d: 't1:2' }],
    [
      'frees the old seat of someone moving',
      ['a', 'c', 'd'],
      { tableId: 't1', index: 2 },
      { a: 't1:2', c: 't1:3', d: 't1:0' },
    ],
    ['swaps a single guest with the occupant', ['e'], { tableId: 't1', index: 0 }, { e: 't1:0', a: null }],
    ['swaps two seated guests', ['a'], { tableId: 't2', index: 1 }, { a: 't2:1', x: 't1:0' }],
    ['is a no-op for a guest already in the seat', ['a'], { tableId: 't1', index: 0 }, { a: 't1:0' }],
  ])('%s', (_, ids, target, expected) => {
    const next = must(seatGuests(base, ids, target)).event;
    for (const [id, seat] of Object.entries(expected)) expect(seatOf(next, id)).toBe(seat);
  });

  it.each<[string, string[], { tableId: string; index: number }, unknown]>([
    [
      'no room for the whole party',
      ['c', 'd', 'e'],
      { tableId: 't1', index: 2 },
      { ok: false, reason: 'no-room', free: 2 },
    ],
    [
      'group onto an occupied seat',
      ['c', 'd'],
      { tableId: 't1', index: 0 },
      { ok: false, reason: 'occupied', guestId: 'a' },
    ],
    ['unknown guest', ['zz'], { tableId: 't1', index: 0 }, { ok: false, reason: 'not-found', ids: ['zz'] }],
    ['unknown table', ['e'], { tableId: 'nope', index: 0 }, { ok: false, reason: 'not-found', ids: ['nope'] }],
    ['seat past the end', ['e'], { tableId: 't1', index: 4 }, { ok: false, reason: 'invalid', field: 'seat' }],
    ['no guests', [], { tableId: 't1', index: 0 }, { ok: false, reason: 'invalid', field: 'guestIds' }],
  ])('fails: %s', (_, ids, target, expected) => {
    expect(failure(seatGuests(base, ids, target))).toEqual(expected);
  });

  it('never mutates its input', () => {
    const snapshot = JSON.stringify(base);
    seatGuests(base, ['c', 'd'], { tableId: 't1', index: 2 });
    expect(JSON.stringify(base)).toBe(snapshot);
  });

  it('shares untouched guests and tables', () => {
    const next = must(seatGuests(base, ['e'], { tableId: 't1', index: 2 })).event;
    expect(next.tables).toBe(base.tables);
    expect(next.guests[0]).toBe(base.guests[0]);
  });
});

describe('unseatGuests and swapSeats', () => {
  it('unseats guests', () => {
    const next = must(unseatGuests(base, ['a', 'b'])).event;
    expect([seatOf(next, 'a'), seatOf(next, 'b')]).toEqual([null, null]);
  });

  it('returns the same event when nobody was seated', () => {
    expect(must(unseatGuests(base, ['c'])).event).toBe(base);
  });

  it('fails for unknown guests', () => {
    expect(failure(unseatGuests(base, ['zz']))).toMatchObject({ reason: 'not-found' });
  });

  it.each<[string, [number, number], Record<string, string | null>]>([
    ['two occupied seats', [0, 1], { a: 't1:1', b: 't1:0' }],
    ['an occupied and an empty seat', [0, 3], { a: 't1:3', b: 't1:1' }],
  ])('swaps %s', (_, [i, j], expected) => {
    const next = must(swapSeats(base, { tableId: 't1', index: i }, { tableId: 't1', index: j })).event;
    for (const [id, seat] of Object.entries(expected)) expect(seatOf(next, id)).toBe(seat);
  });

  it.each([
    [{ tableId: 'nope', index: 0 }, 'not-found'],
    [{ tableId: 't1', index: 9 }, 'invalid'],
  ])('rejects bad seat %o', (seat, reason) => {
    expect(failure(swapSeats(base, { tableId: 't1', index: 0 }, seat))).toMatchObject({ reason });
  });
});

describe('assignTable', () => {
  it('fills the lowest free seats and keeps those already there', () => {
    const next = must(assignTable(base, ['a', 'c', 'd'], 't1')).event;
    expect([seatOf(next, 'a'), seatOf(next, 'c'), seatOf(next, 'd')]).toEqual(['t1:0', 't1:2', 't1:3']);
  });

  it.each<[string, string[], string, unknown]>([
    ['not enough seats', ['c', 'd', 'e'], 't1', { reason: 'no-room', free: 2 }],
    ['unknown table', ['c'], 'zz', { reason: 'not-found', ids: ['zz'] }],
    ['unknown guest', ['zz'], 't1', { reason: 'not-found', ids: ['zz'] }],
  ])('fails: %s', (_, ids, tableId, expected) => {
    expect(failure(assignTable(base, ids, tableId))).toMatchObject(expected as object);
  });
});

describe('guest ops', () => {
  it('adds a guest with defaults and the next id', () => {
    const r = must(addGuest(base, { name: '  Asha Rao ', partyId: 'p1' }));
    expect(r.id).toBe('g-001');
    expect(r.event.guests.at(-1)).toMatchObject({ name: 'Asha Rao', groupId: 'g1', rsvp: 'pending', seat: null });
  });

  it('adds a near-exit rule for a guest who needs access', () => {
    const r = must(addGuest(base, { name: 'Lata', access: true }));
    expect(r.event.rules.at(-1)).toEqual({ id: 'r-4', kind: 'near-exit', guestId: r.id });
  });

  it.each<[string, Parameters<typeof addGuest>[1], unknown, SeatingEvent?]>([
    ['empty name', { name: ' ' }, { reason: 'invalid', field: 'name' }],
    ['unknown group', { name: 'A', groupId: 'zz' }, { reason: 'not-found', ids: ['zz'] }],
    ['unknown party', { name: 'A', partyId: 'zz' }, { reason: 'not-found', ids: ['zz'] }],
    ['unknown plus-one host', { name: 'A', plusOneOf: 'zz' }, { reason: 'not-found', ids: ['zz'] }],
    ['bad rsvp', { name: 'A', rsvp: 'perhaps' as never }, { reason: 'invalid', field: 'rsvp' }],
    ['bad meal', { name: 'A', meal: 'fish' as never }, { reason: 'invalid', field: 'meal' }],
    ['other meal without a note', { name: 'A', meal: 'other' }, { reason: 'invalid', field: 'dietary' }],
    ['no groups at all', { name: 'A' }, { reason: 'invalid', field: 'groupId' }, event({ groups: [] })],
  ])('addGuest fails: %s', (_, draft, expected, e = base) => {
    expect(failure(addGuest(e, draft))).toMatchObject(expected as object);
  });

  it('updates a guest, normalising tags', () => {
    const next = must(updateGuest(base, 'c', { name: 'Chitra', tags: [' VIP', 'vip', ''] })).event;
    expect(next.guests.find((g) => g.id === 'c')).toMatchObject({ name: 'Chitra', tags: ['vip'] });
  });

  it('unseats a guest who declines through updateGuest', () => {
    expect(seatOf(must(updateGuest(base, 'a', { rsvp: 'declined' })).event, 'a')).toBeNull();
  });

  it('syncs the near-exit rule when access changes through updateGuest', () => {
    const next = must(updateGuest(base, 'f', { access: false })).event;
    expect(next.rules.some((r) => r.kind === 'near-exit')).toBe(false);
  });

  it.each<[string, string, Parameters<typeof updateGuest>[2], unknown]>([
    ['unknown guest', 'zz', { name: 'A' }, { reason: 'not-found' }],
    ['own plus-one', 'c', { plusOneOf: 'c' }, { reason: 'invalid', field: 'plusOneOf' }],
    ['other meal without a note', 'c', { meal: 'other' }, { reason: 'invalid', field: 'dietary' }],
  ])('updateGuest fails: %s', (_, id, patch, expected) => {
    expect(failure(updateGuest(base, id, patch))).toMatchObject(expected as object);
  });

  it('removes guests with their rules, plus-one links and empty parties', () => {
    const e = event({
      ...base,
      guests: [...base.guests, guest('y', { plusOneOf: 'f' })],
    });
    const next = must(removeGuests(e, ['a', 'f'])).event;
    expect(next.guests.map((g) => g.id)).toEqual(['b', 'c', 'd', 'e', 'x', 'y']);
    expect(next.guests.find((g) => g.id === 'y')?.plusOneOf).toBeNull();
    expect(next.parties.map((p) => p.id)).toEqual(['p1']);
    expect(next.rules).toEqual([]);
  });

  it('keeps rules that do not mention removed guests', () => {
    expect(must(removeGuests(base, ['b'])).event.rules).toHaveLength(3);
    expect(failure(removeGuests(base, ['zz']))).toMatchObject({ reason: 'not-found' });
  });

  it.each([
    ['accepted', 't1:0'],
    ['declined', null],
  ] as const)('setRsvp %s', (rsvp, seat) => {
    const next = must(setRsvp(base, ['a', 'c'], rsvp)).event;
    expect(next.guests.find((g) => g.id === 'c')?.rsvp).toBe(rsvp);
    expect(seatOf(next, 'a')).toBe(seat);
  });

  it('rejects an unknown rsvp', () => {
    expect(failure(setRsvp(base, ['a'], 'nah' as never))).toMatchObject({ reason: 'invalid' });
  });

  it('adds and removes tags in bulk', () => {
    const tagged = must(addTag(base, ['a', 'b'], ' VIP ')).event;
    expect(tagged.guests[0]?.tags).toEqual(['vip']);
    expect(must(addTag(tagged, ['a'], 'vip')).event.guests[0]).toBe(tagged.guests[0]);
    const untagged = must(removeTag(tagged, ['a'], 'VIP')).event;
    expect(untagged.guests[0]?.tags).toEqual([]);
    expect(untagged.guests[1]?.tags).toEqual(['vip']);
    expect(failure(addTag(base, ['a'], '  '))).toMatchObject({ reason: 'invalid', field: 'tag' });
    expect(failure(addTag(base, ['zz'], 'x'))).toMatchObject({ reason: 'not-found' });
  });

  it.each([
    ['e', true, 1],
    ['f', false, 0],
    ['f', true, 1],
  ] as const)('setAccess(%s, %s) leaves %i near-exit rules for them', (id, access, count) => {
    const next = must(setAccess(base, id, access)).event;
    expect(next.guests.find((g) => g.id === id)?.access).toBe(access);
    expect(next.rules.filter((r) => r.kind === 'near-exit' && r.guestId === id)).toHaveLength(count);
  });

  it('setAccess fails for unknown guests', () => {
    expect(failure(setAccess(base, 'zz', true))).toMatchObject({ reason: 'not-found' });
  });
});

describe('table ops', () => {
  it('adds a table with the next id and label, clamped to the plan', () => {
    const r = must(addTable(base, { shape: 'round', seats: 8, x: -50, y: 9999 }));
    expect(r.id).toBe('t-1');
    expect(r.event.tables.at(-1)).toMatchObject({ label: 'T3', x: 0, y: 700, rotation: 0 });
  });

  it.each([
    [{ shape: 'round', seats: 0, x: 1, y: 1 }, 'seats'],
    [{ shape: 'round', seats: 2.5, x: 1, y: 1 }, 'seats'],
    [{ shape: 'long', seats: 8, x: Number.NaN, y: 1 }, 'position'],
  ] as const)('addTable rejects %o', (draft, field) => {
    expect(failure(addTable(base, draft))).toMatchObject({ reason: 'invalid', field });
  });

  it('labels tables after the highest T number', () => {
    expect(nextTableLabel([table('a', { label: 'T4' }), table('b', { label: 'Head' })])).toBe('T5');
  });

  it('moves, rotates and renames', () => {
    let e = must(moveTable(base, 't1', 120, 80)).event;
    e = must(rotateTable(e, 't1')).event;
    e = must(rotateTable(e, 't2', 0)).event;
    e = must(renameTable(e, 't1', ' Family ')).event;
    expect(e.tables[0]).toMatchObject({ x: 120, y: 80, rotation: 90, label: 'Family' });
    expect(must(rotateTable(e, 't1')).event.tables[0]?.rotation).toBe(0);
  });

  it('resizes and unseats guests on removed seats', () => {
    const next = must(resizeTable(base, 't1', 1)).event;
    expect(next.tables[0]?.seats).toBe(1);
    expect([seatOf(next, 'a'), seatOf(next, 'b')]).toEqual(['t1:0', null]);
  });

  it('removes a table and unseats its guests', () => {
    const next = must(removeTable(base, 't2')).event;
    expect(next.tables.map((t) => t.id)).toEqual(['t1']);
    expect([seatOf(next, 'f'), seatOf(next, 'x')]).toEqual([null, null]);
  });

  it.each<[string, (e: SeatingEvent) => OpResult, string]>([
    ['move unknown', (e) => moveTable(e, 'zz', 0, 0), 'not-found'],
    ['move to NaN', (e) => moveTable(e, 't1', Number.NaN, 0), 'invalid'],
    ['resize unknown', (e) => resizeTable(e, 'zz', 4), 'not-found'],
    ['resize to 99', (e) => resizeTable(e, 't1', 99), 'invalid'],
    ['rotate unknown', (e) => rotateTable(e, 'zz'), 'not-found'],
    ['rename unknown', (e) => renameTable(e, 'zz', 'A'), 'not-found'],
    ['rename to blank', (e) => renameTable(e, 't1', ' '), 'invalid'],
    ['remove unknown', (e) => removeTable(e, 'zz'), 'not-found'],
  ])('fails: %s', (_, op, reason) => {
    expect(failure(op(base))).toMatchObject({ reason });
  });
});

describe('rule ops', () => {
  it('adds a rule with the next id', () => {
    const r = must(addRule(base, { kind: 'apart', guests: ['b', 'c'] }));
    expect(r.id).toBe('r-4');
    expect(r.event.rules.at(-1)).toEqual({ id: 'r-4', kind: 'apart', guests: ['b', 'c'] });
  });

  it.each<[string, Parameters<typeof addRule>[1], unknown]>([
    ['apart with self', { kind: 'apart', guests: ['a', 'a'] }, { reason: 'invalid', field: 'guests' }],
    ['apart with unknown', { kind: 'apart', guests: ['a', 'zz'] }, { reason: 'not-found', ids: ['zz'] }],
    ['duplicate apart, either order', { kind: 'apart', guests: ['e', 'a'] }, { reason: 'duplicate', ruleId: 'r-1' }],
    ['together for unknown party', { kind: 'together', partyId: 'zz' }, { reason: 'not-found' }],
    ['duplicate together', { kind: 'together', partyId: 'p2' }, { reason: 'duplicate', ruleId: 'r-2' }],
    ['near-exit for unknown guest', { kind: 'near-exit', guestId: 'zz' }, { reason: 'not-found' }],
    ['duplicate near-exit', { kind: 'near-exit', guestId: 'f' }, { reason: 'duplicate', ruleId: 'r-3' }],
  ])('addRule fails: %s', (_, draft, expected) => {
    expect(failure(addRule(base, draft))).toMatchObject(expected as object);
  });

  it('adds together and near-exit rules', () => {
    expect(must(addRule(base, { kind: 'together', partyId: 'p1' })).event.rules).toHaveLength(4);
    expect(must(addRule(base, { kind: 'near-exit', guestId: 'a' })).event.rules).toHaveLength(4);
  });

  it('removes a rule', () => {
    expect(must(removeRule(base, 'r-1')).event.rules.map((r) => r.id)).toEqual(['r-2', 'r-3']);
    expect(failure(removeRule(base, 'zz'))).toMatchObject({ reason: 'not-found' });
  });
});

describe('ids and touch', () => {
  it.each([
    ['g', [], 3, 'g-001'],
    ['g', ['g-009', 'g-010', 'x-99', 'g-abc'], 3, 'g-011'],
    ['t', ['t-head', 't-2'], 0, 't-3'],
  ] as const)('nextId(%s, %o)', (prefix, ids, pad, expected) => {
    expect(
      nextId(
        prefix,
        ids.map((id) => ({ id })),
        pad,
      ),
    ).toBe(expected);
  });

  it('names ids by kind', () => {
    expect(nextIdFor('party', [{ id: 'p-007' }])).toBe('p-008');
  });

  it('stamps updatedAt only when it changes', () => {
    expect(touch(base, base.updatedAt)).toBe(base);
    expect(touch(base, '2027-01-01T00:00:00.000Z').updatedAt).toBe('2027-01-01T00:00:00.000Z');
  });
});
