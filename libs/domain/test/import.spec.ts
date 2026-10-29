import { describe, expect, it } from 'vitest';
import {
  applyImport,
  createSampleWedding,
  findDuplicates,
  isEmail,
  normalizeMeal,
  normalizeName,
  normalizeRsvp,
  parseCsv,
  SAMPLE_CSV,
  suggestMapping,
  toCsv,
  validateRows,
  type DuplicateDecision,
  type ImportMapping,
} from '../src';
import { event, guest, party } from './support/builders';

describe('parseCsv', () => {
  it.each<[string, string, string[][]]>([
    [
      'simple rows',
      'a,b\nc,d',
      [
        ['a', 'b'],
        ['c', 'd'],
      ],
    ],
    [
      'CRLF and trailing newline',
      'a,b\r\nc,d\r\n',
      [
        ['a', 'b'],
        ['c', 'd'],
      ],
    ],
    ['lone CR line breaks', 'a\rb', [['a'], ['b']]],
    ['a byte-order mark', '﻿name\nAsha', [['name'], ['Asha']]],
    ['quoted commas', '"Rao, Asha",x', [['Rao, Asha', 'x']]],
    ['escaped quotes', '"say ""hi""",x', [['say "hi"', 'x']]],
    [
      'newlines inside quotes',
      '"line 1\r\nline 2",x\ny,z',
      [
        ['line 1\r\nline 2', 'x'],
        ['y', 'z'],
      ],
    ],
    ['empty fields', ',a,,', [['', 'a', '', '']]],
    ['blank lines', 'a\n\n\nb\n', [['a'], ['b']]],
    ['an empty quoted field', '"",a', [['', 'a']]],
    ['a quote mid-field kept literally', 'a"b,c', [['a"b', 'c']]],
    ['no input', '', []],
  ])('handles %s', (_, text, rows) => {
    expect(parseCsv(text)).toEqual(rows);
  });

  it('round-trips through toCsv', () => {
    const rows = [
      ['Name', 'Notes'],
      ['Asha "A" Rao', 'one, two'],
      ['B', 'line\nbreak'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});

describe('suggestMapping', () => {
  it.each<[string[], Partial<ImportMapping>]>([
    [
      ['Full name', 'E-mail', 'Household', 'Side', 'Attending', 'Menu', 'Allergies', 'Tags', 'Wheelchair', 'Notes'],
      { name: 0, email: 1, party: 2, group: 3, rsvp: 4, meal: 5, dietary: 6, tags: 7, access: 8, notes: 9 },
    ],
    [
      [
        'Guest',
        'Email address',
        'Family',
        'Team',
        'RSVP status',
        'Meal preference',
        'Dietary requirements',
        'Step-free access',
      ],
      { name: 0, email: 1, party: 2, group: 3, rsvp: 4, meal: 5, dietary: 6, access: 7, tags: null, notes: null },
    ],
    [['Name', 'Status', 'Extra'], { name: 0, rsvp: 1, email: null, party: null }],
    [['', 'guestname', 'emailid'], { name: 1, email: 2 }],
  ])('maps %o', (headers, expected) => {
    expect(suggestMapping(headers)).toMatchObject(expected);
  });
});

describe('normalizers', () => {
  it.each([
    ['yes', 'accepted'],
    ['Y', 'accepted'],
    ['Attending', 'accepted'],
    ['No', 'declined'],
    ['Not attending', 'declined'],
    ['maybe', 'pending'],
    ['TBC', 'pending'],
    ['sure thing', undefined],
  ])('rsvp %s -> %s', (raw, expected) => {
    expect(normalizeRsvp(raw)).toBe(expected);
  });

  it.each([
    ['Vegetarian', 'veg'],
    ['non vegetarian', 'non-veg'],
    ['Non-Veg', 'non-veg'],
    ['JAIN', 'jain'],
    ['vegan', 'vegan'],
    ['other', 'other'],
    ['pescatarian', undefined],
  ])('meal %s -> %s', (raw, expected) => {
    expect(normalizeMeal(raw)).toBe(expected);
  });

  it.each([
    ['a@b.co', true],
    ['a.b@c.d.in', true],
    ['a@b', false],
    ['a b@c.de', false],
    ['@b.co', false],
  ])('isEmail(%s) is %s', (raw, expected) => {
    expect(isEmail(raw)).toBe(expected);
  });

  it('normalizes names for matching', () => {
    expect(normalizeName("  Zoë   D'Souza ")).toBe('zoe d souza');
  });
});

describe('validateRows', () => {
  const headers = ['Name', 'Email', 'Party', 'Group', 'RSVP', 'Meal', 'Diet', 'Tags', 'Access', 'Notes'];
  const mapping = suggestMapping(headers);

  it('normalizes values and leaves out what the file does not say', () => {
    const [row] = validateRows(
      [[' Asha   Rao ', 'ASHA@X.IN', 'The Raos', 'Family', 'yes', 'Vegetarian', 'No nuts', 'VIP; kids', 'yes', 'hi']],
      mapping,
    );
    expect(row).toEqual({
      index: 0,
      errors: [],
      values: {
        name: 'Asha Rao',
        email: 'asha@x.in',
        party: 'The Raos',
        group: 'Family',
        rsvp: 'accepted',
        meal: 'veg',
        dietary: 'No nuts',
        tags: ['vip', 'kids'],
        access: true,
        notes: 'hi',
      },
    });
    expect(validateRows([['B']], mapping)[0]?.values).toEqual({ name: 'B' });
  });

  it.each([
    [['', 'a@b.co'], [['name', 'missing-name']]],
    [['A', 'nope'], [['email', 'bad-email']]],
    [['A', '', '', '', 'perhaps'], [['rsvp', 'unknown-rsvp']]],
    [['A', '', '', '', '', 'fish fry'], [['meal', 'unknown-meal']]],
    [
      ['', 'x', '', '', '?', 'x'],
      [
        ['name', 'missing-name'],
        ['email', 'bad-email'],
        ['meal', 'unknown-meal'],
      ],
    ],
  ])('reports %o', (raw, expected) => {
    expect(validateRows([raw], mapping)[0]?.errors.map((e) => [e.field, e.code])).toEqual(expected);
  });

  it('reads access as false for "no"', () => {
    expect(validateRows([['A', '', '', '', '', '', '', '', 'no']], mapping)[0]?.values.access).toBe(false);
  });

  it('treats unmapped fields as empty', () => {
    const none = suggestMapping(['Name']);
    expect(validateRows([['A', 'b@c.de']], none)[0]?.values).toEqual({ name: 'A' });
  });
});

describe('findDuplicates and applyImport', () => {
  const base = event({
    groups: [
      { id: 'g1', label: 'Family', tone: 1 },
      { id: 'g2', label: 'Friends', tone: 2 },
    ],
    parties: [party('p1', 'The Raos')],
    guests: [
      guest('a', {
        name: 'Asha Rao',
        email: 'asha@x.in',
        partyId: 'p1',
        tags: ['vip'],
        seat: { tableId: 't1', index: 0 },
      }),
      guest('b', { name: 'Bina Shah', email: '' }),
    ],
  });
  const mapping = suggestMapping(['Name', 'Email', 'Party', 'Group', 'RSVP', 'Meal', 'Tags', 'Access']);
  const rows = validateRows(
    [
      ['Someone Else', 'ASHA@x.in', '', '', 'no', '', 'kids'], // 0: email dupe of a
      ['bina  shah', '', '', 'Friends'], // 1: name dupe of b
      ['Chetan Rao', 'c@x.in', 'the raos', 'Cousins', 'yes', 'jain', '', 'yes'], // 2: new, existing party, new group
      ['', 'd@x.in'], // 3: no name
      ['Dev', 'bad', 'The Devs', 'cousins'], // 4: new party, reuses the new group
    ],
    mapping,
  );

  it('matches by email first, then by name', () => {
    expect(findDuplicates(rows, base.guests)).toEqual([
      { rowIndex: 0, guestId: 'a', by: 'email' },
      { rowIndex: 1, guestId: 'b', by: 'name' },
    ]);
  });

  it('skips duplicates by default and adds the rest', () => {
    const r = applyImport(base, rows);
    expect(r.added).toEqual(['g-001', 'g-002']);
    expect(r.merged).toEqual([]);
    expect(r.skipped).toEqual([0, 1, 3]);
    const chetan = r.event.guests.find((g) => g.id === 'g-001');
    expect(chetan).toMatchObject({ name: 'Chetan Rao', partyId: 'p1', rsvp: 'accepted', meal: 'jain', access: true });
    expect(r.event.groups.at(-1)).toEqual({ id: 'grp-1', label: 'Cousins', tone: 3 });
    expect(chetan?.groupId).toBe('grp-1');
    const dev = r.event.guests.find((g) => g.id === 'g-002');
    expect(dev).toMatchObject({ email: '', groupId: 'grp-1', rsvp: 'pending', meal: 'veg' });
    expect(r.event.parties.at(-1)).toEqual({ id: 'p-001', label: 'The Devs' });
    expect(r.event.rules).toEqual([{ id: 'r-1', kind: 'near-exit', guestId: 'g-001' }]);
  });

  it('merges, keeps both, or skips as decided', () => {
    const decisions = new Map<number, DuplicateDecision>([
      [0, 'merge'],
      [1, 'keep-both'],
      [2, 'skip'],
    ]);
    const r = applyImport(base, rows, decisions);
    expect(r.merged).toEqual(['a']);
    expect(r.added).toEqual(['g-001', 'g-002']);
    expect(r.skipped).toEqual([2, 3]);
    const asha = r.event.guests.find((g) => g.id === 'a');
    // Merging keeps the name and fills only what the row says; declining frees the seat.
    expect(asha).toMatchObject({
      name: 'Asha Rao',
      rsvp: 'declined',
      tags: ['vip', 'kids'],
      seat: null,
      partyId: 'p1',
    });
    expect(r.event.guests.filter((g) => g.name.toLowerCase().includes('bina'))).toHaveLength(2);
  });

  it('merges access changes into near-exit rules', () => {
    const m = suggestMapping(['Name', 'Access']);
    const r = applyImport(base, validateRows([['Bina Shah', 'wheelchair']], m), new Map([[0, 'merge']]));
    expect(r.event.rules).toEqual([{ id: 'r-1', kind: 'near-exit', guestId: 'b' }]);
    expect(r.event.guests.find((g) => g.id === 'b')?.access).toBe(true);
  });

  it('returns the same event when nothing is imported', () => {
    expect(applyImport(base, []).event).toBe(base);
  });

  it('wraps new group tones and creates a group when the event has none', () => {
    const four = event({
      groups: [1, 2, 3, 4].map((tone) => ({ id: `g${tone}`, label: `G${tone}`, tone: tone as 1 | 2 | 3 | 4 })),
    });
    const m = suggestMapping(['Name', 'Group']);
    expect(applyImport(four, validateRows([['A', 'New']], m)).event.groups.at(-1)?.tone).toBe(1);
    const empty = applyImport(event({ groups: [] }), validateRows([['A']], m)).event;
    expect(empty.groups).toEqual([{ id: 'grp-1', label: 'Guests', tone: 1 }]);
    expect(empty.guests[0]?.groupId).toBe('grp-1');
  });
});

describe('SAMPLE_CSV', () => {
  const wedding = createSampleWedding(new Date('2026-10-29T00:00:00Z'));
  const [headers = [], ...data] = parseCsv(SAMPLE_CSV);
  const mapping = suggestMapping(headers);
  const rows = validateRows(data, mapping, wedding);

  it('maps every field', () => {
    expect(Object.values(mapping).every((v) => v !== null)).toBe(true);
    expect(data).toHaveLength(12);
  });

  it('has exactly one missing name and one bad email', () => {
    const errors = rows.flatMap((r) => r.errors.map((e) => e.code));
    expect(errors.sort()).toEqual(['bad-email', 'missing-name']);
  });

  it('has two duplicates of sample guests, one by email and one by name', () => {
    const dupes = findDuplicates(rows, wedding.guests);
    const names = dupes.map((d) => [wedding.guests.find((g) => g.id === d.guestId)?.name, d.by]);
    expect(names).toEqual([
      ['Dev Malhotra', 'email'],
      ['Kamla Mehta', 'name'],
    ]);
  });

  it('imports cleanly into the sample wedding', () => {
    const r = applyImport(wedding, rows);
    expect(r.added).toHaveLength(9);
    expect(r.skipped).toHaveLength(3);
    expect(r.event.groups.map((g) => g.label)).toContain('Cousins');
    expect(r.event.parties.filter((p) => p.label === 'The Mehtas')).toHaveLength(1);
    expect(r.event.guests.find((g) => g.name === "Joel D'Souza")?.notes).toBe('Bringing his "famous" playlist');
  });
});
