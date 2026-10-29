import { createSampleWedding, type Guest, type Meal, type SeatingEvent, type Table } from '@seated/domain';
import { mealTotals, placeCards, tableList, totalsText } from './print.vm';

function table(id: string, label: string, seats: number): Table {
  return { id, label, shape: 'round', seats, x: 0, y: 0, rotation: 0 };
}

function guest(id: string, name: string, meal: Meal, seat: [string, number] | null): Guest {
  return {
    id,
    name,
    email: '',
    partyId: null,
    groupId: 'grp-1',
    rsvp: 'accepted',
    meal,
    dietary: '',
    tags: [],
    access: false,
    plusOneOf: null,
    notes: '',
    seat: seat ? { tableId: seat[0], index: seat[1] } : null,
  };
}

const small = {
  ...createSampleWedding(new Date('2026-10-29T10:00:00Z')),
  tables: [table('t2', 'T2', 4), table('t1', 'T1', 3), table('t3', 'T3', 2)],
  guests: [
    guest('a', 'Asha', 'veg', ['t1', 2]),
    guest('b', 'Bina', 'jain', ['t1', 0]),
    guest('c', 'Chetan', 'non-veg', ['t2', 3]),
    guest('d', 'Dev', 'veg', null),
    guest('e', 'Esha', 'veg', ['gone', 0]),
  ],
} satisfies SeatingEvent;

describe('print vm', () => {
  it('orders place cards by table as listed, then by seat, and skips unseated guests', () => {
    expect(placeCards(small).map((c) => `${c.name} ${c.table}/${c.seat}`)).toEqual([
      'Chetan T2/4',
      'Bina T1/1',
      'Asha T1/3',
    ]);
  });

  it('prints one table on request', () => {
    expect(placeCards(small, 't1').map((c) => c.name)).toEqual(['Bina', 'Asha']);
  });

  it('lists every seat of each table with gaps, leaving out empty tables', () => {
    const blocks = tableList(small);
    expect(blocks.map((b) => [b.label, b.seated, b.capacity])).toEqual([
      ['T2', 1, 4],
      ['T1', 2, 3],
    ]);
    expect(blocks[1]?.rows).toEqual([
      { seat: 1, name: 'Bina', meal: 'jain' },
      { seat: 2, name: null, meal: null },
      { seat: 3, name: 'Asha', meal: 'veg' },
    ]);
  });

  it.each<[Meal[], string]>([
    [[], ''],
    [['veg'], '1 Veg'],
    [['jain', 'veg', 'veg', 'non-veg'], '2 Veg · 1 Non-veg · 1 Jain'],
    [['other', 'vegan'], '1 Vegan · 1 Other'],
  ])('totals meals %j as %j', (meals, text) => {
    expect(totalsText(mealTotals(meals))).toBe(text);
  });

  it('adds up the sample wedding for the caterer', () => {
    const wedding = createSampleWedding(new Date('2026-10-29T10:00:00Z'));
    const blocks = tableList(wedding);
    const seated = blocks.reduce((n, b) => n + b.seated, 0);
    expect(seated).toBe(84);
    expect(blocks.flatMap((b) => b.meals).reduce((n, m) => n + m.count, 0)).toBe(84);
    expect(placeCards(wedding)).toHaveLength(84);
  });
});
