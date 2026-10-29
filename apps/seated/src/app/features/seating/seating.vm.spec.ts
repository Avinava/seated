import { createSampleWedding, type Guest, type SeatingEvent, type Table } from '@seated/domain';
import {
  EMPTY_SEAT_CONTEXT,
  autoSummary,
  dropPreview,
  findFreeSpot,
  holdingMessage,
  legend,
  mealCounts,
  midSentence,
  partyPayload,
  readingOrder,
  seatKey,
  seatViews,
  snap,
  spokenTableName,
  tableAriaLabel,
  toneFor,
  unseatedGroups,
  type ColorBy,
  type SeatContext,
} from './seating.vm';

const wedding = createSampleWedding(new Date('2026-10-29T10:00:00Z'));
const groups = new Map(wedding.groups.map((g) => [g.id, g]));

function guest(over: Partial<Guest> = {}): Guest {
  return {
    id: 'g-x',
    name: 'Aarav Shah',
    email: '',
    partyId: null,
    groupId: 'grp-2',
    rsvp: 'accepted',
    meal: 'jain',
    dietary: '',
    tags: [],
    access: false,
    plusOneOf: null,
    notes: '',
    seat: null,
    ...over,
  };
}

function table(over: Partial<Table> = {}): Table {
  return { id: 't-9', label: 'T9', shape: 'round', seats: 4, x: 100, y: 100, rotation: 0, ...over };
}

describe('seating view model', () => {
  it.each<[ColorBy, Guest['rsvp'], number | null]>([
    ['group', 'accepted', 2],
    ['meal', 'accepted', 3],
    ['rsvp', 'accepted', 1],
    ['rsvp', 'pending', 2],
    ['rsvp', 'declined', null],
  ])('colours by %s (rsvp %s) with tone %s', (colorBy, rsvp, tone) => {
    expect(toneFor(guest({ rsvp }), colorBy, groups)).toBe(tone);
  });

  it.each<[ColorBy, number]>([
    ['group', 4],
    ['meal', 5],
    ['rsvp', 2],
  ])('has a %s legend of %i entries', (colorBy, n) => {
    expect(legend(colorBy, wedding.groups)).toHaveLength(n);
  });

  describe('seatViews', () => {
    const t = table();
    const at = (index: number, over: Partial<Guest> = {}) =>
      guest({ id: `g-${index}`, name: `Guest ${index} Kumar`, seat: { tableId: t.id, index }, ...over });
    const guests = [at(0), at(1), at(2)];
    const ctx = (over: Partial<SeatContext>): SeatContext => ({ ...EMPTY_SEAT_CONTEXT, groups, ...over });

    it.each<[string, Partial<SeatContext>, string[]]>([
      ['plain', {}, ['filled', 'filled', 'filled', 'empty']],
      ['a conflict', { conflicts: new Set(['g-1']) }, ['filled', 'conflict', 'filled', 'empty']],
      [
        'a held guest',
        { held: new Set(['g-0']), conflicts: new Set(['g-0']) },
        ['picked', 'filled', 'filled', 'empty'],
      ],
      [
        'a drop preview',
        { preview: new Set([seatKey({ tableId: t.id, index: 3 })]) },
        ['filled', 'filled', 'filled', 'drop-target'],
      ],
      ['a highlight', { highlight: new Set(['g-2']) }, ['filled', 'filled', 'picked', 'empty']],
      [
        'a highlighted conflict',
        { highlight: new Set(['g-1']), conflicts: new Set(['g-1']) },
        ['filled', 'conflict', 'filled', 'empty'],
      ],
    ])('gives each seat its state with %s', (_, over, states) => {
      expect(seatViews(t, guests, ctx(over)).map((s) => s.state)).toEqual(states);
    });

    it('names every seat and marks the glow', () => {
      const views = seatViews(t, guests, ctx({ conflicts: new Set(['g-1']), justPlaced: new Set(['t-9:0']) }));
      expect(views.map((v) => v.label)).toEqual([
        'Seat 1, Guest 0 Kumar',
        'Seat 2, Guest 1 Kumar, breaks a rule',
        'Seat 3, Guest 2 Kumar',
        'Seat 4, empty',
      ]);
      expect(views[0]).toMatchObject({ initials: 'GK', tone: 2, justPlaced: true });
      expect(views[3]).toMatchObject({ initials: '', tone: null, justPlaced: false });
    });
  });

  it.each([
    ['T3', 'Table 3'],
    ['Head', 'Head table'],
    ['Long A', 'Long A table'],
    ['Kids table', 'Kids table'],
  ])('speaks %s as %s', (label, spoken) => {
    expect(spokenTableName(label)).toBe(spoken);
  });

  it.each<[number, number, boolean, string]>([
    [7, 0, false, 'Table 3, 7 of 10 seated'],
    [7, 1, true, 'Table 3, 7 of 10 seated, 1 conflict, near the exit'],
    [10, 2, false, 'Table 3, 10 of 10 seated, 2 conflicts'],
  ])('labels a table with %i seated and %i conflicts', (filled, conflicts, exit, label) => {
    expect(tableAriaLabel(table({ label: 'T3', seats: 10 }), filled, conflicts, exit)).toBe(label);
  });

  it('orders tables in rows, top to bottom then left to right', () => {
    const order = readingOrder(wedding.tables).map((t) => t.label);
    // The long tables (centre y 450) share a row with the first round row (y 390).
    expect(order).toEqual(['Head', 'Long A', 'Long B', 'T4', 'T3', 'T2', 'T1', 'T8', 'T7', 'T6', 'T5']);
  });

  describe('unseatedGroups', () => {
    it('groups coming guests by party before those awaiting a reply', () => {
      const list = unseatedGroups(wedding, '');
      const coming = list.filter((g) => !g.pending);
      expect(coming.flatMap((g) => g.members)).toHaveLength(16);
      expect(list.flatMap((g) => g.members)).toHaveLength(28);
      expect(list.findIndex((g) => g.pending)).toBe(coming.length);
      expect(list.every((g) => g.members.every((m) => m.seat === null && m.rsvp !== 'declined'))).toBe(true);
    });

    it.each([
      ['a name', 'chawla'],
      ['a household', 'the chawlas'],
    ])('filters by %s, keeping the household together', (_, query) => {
      const list = unseatedGroups(wedding, query);
      expect(list.length).toBeGreaterThan(0);
      expect(
        list.every(
          (g) =>
            g.label.toLowerCase().includes('chawla') || g.members.some((m) => m.name.toLowerCase().includes('chawla')),
        ),
      ).toBe(true);
    });

    it('returns nothing for a query that matches no one', () => {
      expect(unseatedGroups(wedding, 'zzz')).toEqual([]);
    });
  });

  it.each([
    ['The Mehtas', 'the Mehtas'],
    ['Ananya & Kabir', 'Ananya & Kabir'],
  ])('puts %s mid-sentence as %s', (label, out) => {
    expect(midSentence(label)).toBe(out);
  });

  it('phrases the hold for a party and a single guest', () => {
    const party = unseatedGroups(wedding, '').find((g) => g.members.length > 1)!;
    const p = partyPayload(party);
    expect(holdingMessage(p)).toBe(`Holding ${p.label}, ${p.guestIds.length} guests. Choose a seat. Escape to cancel.`);
    expect(holdingMessage({ guestIds: ['g'], label: 'Aarav Shah', from: null })).toBe(
      'Holding Aarav Shah. Choose a seat. Escape to cancel.',
    );
  });

  describe('dropPreview', () => {
    const party = unseatedGroups(wedding, '').find((g) => g.members.length === 2 && !g.pending)!;
    const payload = partyPayload(party);
    const emptySeat = (e: SeatingEvent) => {
      for (const t of e.tables) {
        const taken = new Set(e.guests.filter((g) => g.seat?.tableId === t.id).map((g) => g.seat!.index));
        for (let i = 0; i < t.seats; i++) {
          if (!taken.has(i) && !taken.has((i + 1) % t.seats) && t.seats - taken.size >= 2)
            return { tableId: t.id, index: i };
        }
      }
      throw new Error('no room');
    };

    it('shows where the whole party would land', () => {
      const target = emptySeat(wedding);
      const p = dropPreview(wedding, payload, target);
      expect(p.ok).toBe(true);
      if (p.ok) {
        expect(p.seats).toHaveLength(2);
        expect(p.seats[0]).toEqual(target);
      }
    });

    it('reports a refused drop on an occupied seat', () => {
      const seated = wedding.guests.find((g) => g.seat)!;
      expect(dropPreview(wedding, payload, seated.seat!)).toEqual({ ok: false, free: null });
    });
  });

  it('counts meals, most common first', () => {
    const counts = mealCounts([guest({ meal: 'veg' }), guest({ meal: 'jain' }), guest({ meal: 'veg' })]);
    expect(counts.map((c) => [c.label, c.count])).toEqual([
      ['Veg', 2],
      ['Jain', 1],
    ]);
  });

  it.each<['round' | 'long' | 'head', number]>([
    ['round', 10],
    ['long', 12],
    ['head', 8],
  ])('finds free space for a new %s table', (shape, seats) => {
    const spot = findFreeSpot(wedding, shape, seats);
    expect(spot.x).toBeGreaterThan(0);
    expect(spot.x).toBeLessThan(wedding.plan.width);
    expect(spot.y).toBeLessThan(wedding.plan.height);
  });

  it.each([
    [14, 10],
    [15, 20],
    [-4, 0],
  ])('snaps %i to %i', (n, out) => {
    expect(snap(n)).toBe(out);
  });

  it('splits the auto-seat summary into placed lines and lines that need a person', () => {
    const lonely = wedding.guests.find((g) => g.seat === null && g.rsvp === 'accepted' && g.partyId === null);
    const names = lonely ? [lonely.name] : ['Nobody'];
    const s = autoSummary(wedding, 3, [
      { code: 'placed-guest', name: 'Aarav Shah', tableLabel: 'T3' },
      { code: 'needs-you', reason: 'no-room', names },
    ]);
    expect(s.title).toBe('Auto-seated 3 guests');
    expect(s.placedLines.map((l) => l.text)).toEqual(['Seated Aarav Shah at T3']);
    expect(s.needsYou[0]?.text).toMatch(/^Needs you: /);
    if (lonely) expect(s.needsYou[0]?.guestIds).toEqual([lonely.id]);
  });
});
