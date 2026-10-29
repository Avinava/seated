import {
  SAMPLE_CSV,
  createSampleWedding,
  findDuplicates,
  parseCsv,
  suggestMapping,
  validateRows,
  type Duplicate,
  type ImportMapping,
  type ImportRow,
} from '@seated/domain';
import {
  canReview,
  columnPreview,
  commandLabel,
  defaultDecisions,
  exportFileName,
  filterCounts,
  matchesFilter,
  restoreError,
  reviewRows,
  sharedColumns,
  summarize,
  summaryText,
} from './import.vm';

const rows = [
  ['Asha', '', 'a@x.in'],
  ['', '', ''],
  ['Bina', 'x', 'b@x.in'],
  ['Chetan', '', ''],
  ['Dev', '', 'd@x.in'],
];

function row(index: number, name: string, errors: ImportRow['errors'] = []): ImportRow {
  return { index, values: { name }, errors };
}

const none: ImportMapping = {
  name: null,
  email: null,
  party: null,
  group: null,
  rsvp: null,
  meal: null,
  dietary: null,
  tags: null,
  access: null,
  notes: null,
};

describe('import vm', () => {
  it.each([
    [0, 3, ['Asha', 'Bina', 'Chetan']],
    [1, 3, ['x']],
    [2, 2, ['a@x.in', 'b@x.in']],
    [null, 3, []],
    [9, 3, []],
  ])('previews column %s', (column, n, values) => {
    expect(columnPreview(rows, column, n)).toEqual(values);
  });

  it.each([
    [{ ...none }, false, []],
    [{ ...none, name: 0 }, true, []],
    [{ ...none, name: 0, email: 0 }, true, ['email']],
    [{ ...none, name: 2, email: 1, notes: 2, tags: 1 }, true, ['tags', 'notes']],
  ])('checks a mapping %#', (mapping, ok, shared) => {
    expect(canReview(mapping)).toBe(ok);
    expect(sharedColumns(mapping)).toEqual(shared);
  });

  it('merges email matches and skips name matches by default', () => {
    const dupes: Duplicate[] = [
      { rowIndex: 1, guestId: 'g1', by: 'email' },
      { rowIndex: 4, guestId: 'g2', by: 'name' },
    ];
    expect([...defaultDecisions(dupes)]).toEqual([
      [1, 'merge'],
      [4, 'skip'],
    ]);
  });

  describe('review', () => {
    const validated = [
      row(0, 'Asha'),
      row(1, '', [{ field: 'name', code: 'missing-name', value: '' }]),
      row(2, 'Bina', [{ field: 'email', code: 'bad-email', value: 'b@' }]),
      row(3, 'Chetan'),
      row(4, 'Dev'),
      row(5, 'Esha'),
    ];
    const dupes: Duplicate[] = [
      { rowIndex: 3, guestId: 'g1', by: 'email' },
      { rowIndex: 4, guestId: 'g2', by: 'name' },
      { rowIndex: 5, guestId: 'g3', by: 'name' },
    ];

    it.each([
      [new Map(), ['new', 'skip-missing', 'new', 'merge', 'skip-duplicate', 'skip-duplicate']],
      [
        new Map([
          [4, 'keep-both'],
          [5, 'merge'],
        ] as const),
        ['new', 'skip-missing', 'new', 'merge', 'new', 'merge'],
      ],
      [
        new Map([[3, 'skip']] as const),
        ['new', 'skip-missing', 'new', 'skip-duplicate', 'skip-duplicate', 'skip-duplicate'],
      ],
    ])('works out each row with choices %#', (choices, outcomes) => {
      const review = reviewRows(validated, dupes, new Map([...defaultDecisions(dupes), ...choices]));
      expect(review.map((r) => r.outcome)).toEqual(outcomes);
    });

    it('gives each row a status, line number and filter membership', () => {
      const review = reviewRows(validated, dupes, defaultDecisions(dupes));
      expect(review.map((r) => r.status)).toEqual(['ready', 'fix', 'fix', 'duplicate', 'duplicate', 'duplicate']);
      expect(review.map((r) => r.line)).toEqual([2, 3, 4, 5, 6, 7]);
      expect(filterCounts(review)).toEqual({ all: 6, problems: 2, duplicates: 3 });
      expect(review.filter((r) => matchesFilter(r, 'problems')).map((r) => r.index)).toEqual([1, 2]);
    });
  });

  it.each([
    [
      { total: 12, added: 9, merged: 1, missing: 1, duplicates: 1 },
      '12 rows: 9 new, 1 to merge, 2 skipped (1 missing name, 1 duplicate)',
    ],
    [{ total: 3, added: 3, merged: 0, missing: 0, duplicates: 0 }, '3 rows: 3 new'],
    [{ total: 1, added: 0, merged: 0, missing: 1, duplicates: 0 }, '1 row: 0 new, 1 skipped (1 missing name)'],
    [
      { total: 1200, added: 1000, merged: 0, missing: 0, duplicates: 200 },
      '1,200 rows: 1,000 new, 200 skipped (200 duplicates)',
    ],
  ])('summarises %j', (summary, text) => {
    expect(summaryText(summary)).toBe(text);
  });

  it.each([
    [{ added: 9, merged: 0 }, 'import 9 guests'],
    [{ added: 1, merged: 0 }, 'import 1 guest'],
    [{ added: 9, merged: 2 }, 'import 9 guests and update 2'],
  ])('labels the command %j', (s, label) => {
    expect(commandLabel(s)).toBe(label);
  });

  it('summarises the sample CSV against the sample wedding', () => {
    const wedding = createSampleWedding(new Date('2026-10-29T10:00:00Z'));
    const [header, ...data] = parseCsv(SAMPLE_CSV);
    const validated = validateRows(data, suggestMapping(header!));
    const dupes = findDuplicates(validated, wedding.guests);
    const review = reviewRows(validated, dupes, defaultDecisions(dupes));
    expect(summaryText(summarize(review))).toBe('12 rows: 9 new, 1 to merge, 2 skipped (1 missing name, 1 duplicate)');
  });

  it('names export files with the slug and local date', () => {
    expect(exportFileName('mehta-wedding', new Date(2026, 9, 29, 23, 30))).toBe('seated-mehta-wedding-2026-10-29.json');
  });

  it.each([
    [[{ code: 'invalid-json', path: '' }], 'not a Seated export'],
    [[{ code: 'wrong-format', path: 'format' }], 'not a Seated export'],
    [[{ code: 'unsupported-version', path: 'version' }], 'newer version'],
    [[{ code: 'invalid-value', path: 'event.guests.3.rsvp' }], 'event.guests.3.rsvp'],
  ] as const)('explains a failed restore %#', (errors, text) => {
    expect(restoreError(errors)).toContain(text);
  });
});
