import { isGridGroupRow, type GridRow } from '@seated/kit';
import {
  EMPTY_QUERY,
  filterRows,
  groupRows,
  guestCount,
  isFiltered,
  parseQuery,
  parseSort,
  formatSort,
  rsvpCounts,
  sentence,
  shownText,
  sortRows,
  summary,
  tableOptions,
  tagsInUse,
  toRows,
  viewRows,
  who,
  type GuestQuery,
  type GuestRow,
} from './guests.vm';
import { bigWedding, wedding } from './testing';

const event = wedding();
const rows = toRows(event);
const q = (patch: Partial<GuestQuery>): GuestQuery => ({ ...EMPTY_QUERY, ...patch });
const data = (list: GridRow<GuestRow>[]) => list.filter((r): r is GuestRow => !isGridGroupRow(r));
const headings = (list: GridRow<GuestRow>[]) => list.filter(isGridGroupRow).map((g) => `${g.label}:${g.count}`);

describe('guests view model', () => {
  describe('parseQuery', () => {
    it.each([
      [{}, EMPTY_QUERY],
      [{ q: '  kamla ', rsvp: 'declined', by: 'table' }, q({ q: 'kamla', rsvp: 'declined', by: 'table' })],
      [{ rsvp: 'maybe', meal: 'fish', by: 'colour' }, EMPTY_QUERY],
      [{ meal: 'jain', tag: 'vip', group: 'grp-2' }, q({ meal: 'jain', tag: 'vip', group: 'grp-2' })],
      [{ sort: 'table:desc' }, q({ sort: { key: 'table', dir: 'desc' } })],
      [{ sort: 'name' }, q({ sort: { key: 'name', dir: 'asc' } })],
      [{ sort: 'shoe:asc' }, EMPTY_QUERY],
      [{ q: null, group: '' }, EMPTY_QUERY],
    ])('%j', (params, expected) => {
      expect(parseQuery(params)).toEqual(expected);
    });

    it.each([
      [null, null],
      [{ key: 'name', dir: 'asc' } as const, 'name:asc'],
      [{ key: 'rsvp', dir: 'desc' } as const, 'rsvp:desc'],
    ])('formats %j as %s and back', (sort, text) => {
      expect(formatSort(sort)).toBe(text);
      expect(parseSort(text)).toEqual(sort);
    });

    it.each([
      [EMPTY_QUERY, false],
      [q({ by: 'table', sort: { key: 'name', dir: 'asc' } }), false],
      [q({ q: 'x' }), true],
      [q({ rsvp: 'pending' }), true],
      [q({ tag: 'vip' }), true],
    ])('isFiltered(%j) is %s', (query, filtered) => {
      expect(isFiltered(query)).toBe(filtered);
    });
  });

  describe('toRows', () => {
    it('resolves group, party and table labels', () => {
      const kamla = rows.find((r) => r.name === 'Kamla Mehta')!;
      expect(kamla).toMatchObject({
        initials: 'KM',
        groupLabel: "Bride's family",
        partyLabel: 'The Mehtas',
        tableLabel: 'T1',
        rsvp: 'accepted',
        access: true,
        plusOneOf: null,
      });
      expect(rows.filter((r) => r.plusOneOf !== null)).toHaveLength(11);
      expect(rows.filter((r) => r.tableId === null).every((r) => r.tableLabel === '')).toBe(true);
    });
  });

  describe('filterRows', () => {
    it.each([
      ['nothing', q({}), 120],
      ['RSVP declined', q({ rsvp: 'declined' }), 8],
      ['RSVP pending', q({ rsvp: 'pending' }), 12],
      ['a name', q({ q: 'kamla' }), 1],
      [
        'two words in any field',
        q({ q: 'mehta t1' }),
        rows.filter((r) => /mehta/i.test(r.haystack) && /\bt1\b/.test(r.haystack)).length,
      ],
      ['a tag', q({ tag: 'vip' }), rows.filter((r) => r.tags.includes('vip')).length],
      ['a meal', q({ meal: 'jain' }), rows.filter((r) => r.meal === 'jain').length],
      ['a group', q({ group: 'grp-2' }), rows.filter((r) => r.groupId === 'grp-2').length],
      ['no match', q({ q: 'zzzz' }), 0],
    ])('by %s', (_, query, expected) => {
      expect(filterRows(rows, query)).toHaveLength(expected);
    });

    it('can ignore RSVP so the tabs can count every state', () => {
      const all = filterRows(rows, q({ rsvp: 'declined', group: 'grp-1' }), { ignoreRsvp: true });
      const counts = rsvpCounts(all);
      expect(counts.all).toBe(counts.accepted + counts.pending + counts.declined);
      expect(counts.all).toBe(rows.filter((r) => r.groupId === 'grp-1').length);
    });

    it('counts every RSVP state', () => {
      expect(rsvpCounts(rows)).toEqual({ all: 120, accepted: 100, pending: 12, declined: 8 });
    });
  });

  describe('sortRows', () => {
    const sample = rows.slice(0, 40);

    it.each([
      ['name', 'asc'],
      ['name', 'desc'],
      ['rsvp', 'asc'],
      ['table', 'asc'],
      ['party', 'desc'],
      ['meal', 'asc'],
      ['group', 'asc'],
    ] as const)('by %s %s keeps every row', (key, dir) => {
      const sorted = sortRows(sample, { key, dir });
      expect(sorted).toHaveLength(sample.length);
      expect(new Set(sorted.map((r) => r.id))).toEqual(new Set(sample.map((r) => r.id)));
    });

    it('sorts names A to Z and back', () => {
      const names = sortRows(sample, { key: 'name', dir: 'asc' }).map((r) => r.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en-IN', { sensitivity: 'base' })));
      expect(sortRows(sample, { key: 'name', dir: 'desc' }).map((r) => r.name)).toEqual([...names].reverse());
    });

    it('puts unseated guests last in either direction', () => {
      for (const dir of ['asc', 'desc'] as const) {
        const sorted = sortRows(rows, { key: 'table', dir });
        const firstUnseated = sorted.findIndex((r) => r.tableId === null);
        expect(sorted.slice(firstUnseated).every((r) => r.tableId === null)).toBe(true);
      }
      expect(sortRows(rows, { key: 'table', dir: 'asc' })[0]?.tableLabel).toBe('Head');
    });

    it('keeps list order without a sort', () => {
      expect(sortRows(sample, null)).toEqual(sample);
    });
  });

  describe('groupRows', () => {
    it.each([
      ['rsvp', ['Coming:100', 'Awaiting:12', 'Declined:8']],
      ['group', ["Bride's family", "Groom's family", 'Friends', 'Work']],
      ['meal', ['Veg', 'Non-veg', 'Jain', 'Vegan', 'Other']],
    ] as const)('by %s orders buckets naturally', (by, expected) => {
      const grouped = groupRows(rows, by, event);
      const labels = headings(grouped).map((h) => (by === 'rsvp' ? h : h.split(':')[0]));
      expect(labels).toEqual(expected.filter((e) => by !== 'meal' || labels.includes(e)));
      expect(data(grouped)).toHaveLength(120);
    });

    it('puts tables in plan order with Unseated last', () => {
      const labels = headings(groupRows(rows, 'table', event)).map((h) => h.split(':')[0]);
      expect(labels[0]).toBe('Head');
      expect(labels.at(-1)).toBe('Unseated');
    });

    it('puts guests without a party last', () => {
      const solo = rows.map((r) => (r.name === 'Kamla Mehta' ? { ...r, partyId: null, partyLabel: '' } : r));
      const before = rows.filter((r) => r.partyId === null).length;
      expect(headings(groupRows(solo, 'party', event)).at(-1)).toBe(`No party:${before + 1}`);
    });

    it('adds nothing when not grouping', () => {
      expect(groupRows(rows, 'none', event)).toEqual(rows);
    });

    it('runs the whole pipeline', () => {
      const view = viewRows(rows, q({ rsvp: 'declined', by: 'group', sort: { key: 'name', dir: 'asc' } }), event);
      expect(data(view)).toHaveLength(8);
      expect(headings(view).reduce((n, h) => n + Number(h.split(':').at(-1)), 0)).toBe(8);
    });
  });

  describe('text', () => {
    it.each([
      [1, '1 guest'],
      [3, '3 guests'],
      [120000, '1,20,000 guests'],
    ])('guestCount(%i) is "%s"', (n, text) => {
      expect(guestCount(n)).toBe(text);
    });

    it('summarises the event for the header', () => {
      expect(summary(event)).toBe('120 guests · 100 coming · 84 seated');
      expect(shownText(8, 120)).toBe('8 of 120 shown');
    });

    it.each([
      [[{ name: 'Kamla Mehta' }], 'Kamla Mehta'],
      [[{ name: 'A' }, { name: 'B' }, { name: 'C' }], '3 guests'],
    ])('who(%j) is "%s"', (list, text) => {
      expect(who(list)).toBe(text);
    });

    it('capitalises a label into a sentence', () => {
      expect(sentence('set 3 guests to Coming')).toBe('Set 3 guests to Coming');
    });
  });

  describe('facets', () => {
    it('lists tags A to Z', () => {
      expect(tagsInUse(event)).toEqual(['kids', 'out-of-town', 'vip']);
    });

    it('lists tables with free seats', () => {
      const options = tableOptions(event);
      expect(options).toHaveLength(event.tables.length);
      const free = options.reduce((n, t) => n + t.free, 0);
      expect(free).toBe(event.tables.reduce((n, t) => n + t.seats, 0) - 84);
      expect(options[0]?.text).toMatch(/^Head · (full|\d+ free)$/);
    });
  });

  describe('performance', () => {
    it('filters, sorts and groups 1,000 guests in well under a frame', () => {
      const big = bigWedding(1000);
      const bigRows = toRows(big);
      expect(bigRows).toHaveLength(1000);
      const query = q({ q: 'mehta', rsvp: 'accepted', by: 'table', sort: { key: 'name', dir: 'asc' } });
      viewRows(bigRows, query, big); // warm up
      const runs = 20;
      const start = performance.now();
      for (let i = 0; i < runs; i++) {
        toRows(big);
        viewRows(bigRows, query, big);
      }
      const perRun = (performance.now() - start) / runs;
      // A frame is 16ms; the whole recompute (labels, filter, sort, group) has to leave room for rendering.
      expect(perRun).toBeLessThan(8);
    });
  });
});
