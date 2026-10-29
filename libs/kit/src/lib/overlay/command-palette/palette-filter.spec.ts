import { filterPaletteItems, groupPaletteItems, paletteScore, type PaletteItem } from './palette-filter';

const item = (id: string, label: string, group = 'Actions', extra: Partial<PaletteItem> = {}): PaletteItem => ({
  id,
  label,
  group,
  ...extra,
});

const ITEMS: PaletteItem[] = [
  item('guests', 'Go to guests', 'Navigate'),
  item('plan', 'Go to floor plan', 'Navigate'),
  item('auto', 'Auto-seat guests', 'Actions', { hint: 'Fill empty seats' }),
  item('print', 'Print place cards', 'Actions', { keywords: 'pdf export' }),
  item('theme', 'Toggle dark mode', 'Settings'),
];

describe('paletteScore', () => {
  it.each([
    ['auto', 'Auto-seat guests', 0],
    ['seat', 'Auto-seat guests', 1],
    ['asg', 'Auto-seat guests', 2],
    ['a s', 'Auto-seat guests', 2],
    ['o-se', 'Auto-seat guests', 3],
  ])('"%s" against "%s" scores %i', (query, label, score) => {
    expect(paletteScore(item('x', label), query)).toBe(score);
  });

  it('falls back to hint, group and keywords', () => {
    expect(paletteScore(ITEMS[2]!, 'empty')).toBe(4);
    expect(paletteScore(ITEMS[3]!, 'pdf')).toBe(4);
    expect(paletteScore(ITEMS[0]!, 'navig')).toBe(4);
  });

  it('returns null when nothing matches', () => {
    expect(paletteScore(ITEMS[0]!, 'zzz')).toBeNull();
  });

  it('does not treat a single letter as an initials match', () => {
    expect(paletteScore(item('x', 'Print place cards'), 'c')).toBe(1);
    expect(paletteScore(item('x', 'Undo'), 'x')).toBeNull();
  });
});

describe('filterPaletteItems', () => {
  it('keeps every item in order for a blank query', () => {
    expect(filterPaletteItems(ITEMS, '   ').map((i) => i.id)).toEqual(ITEMS.map((i) => i.id));
  });

  it('ranks prefix matches above word, initials and substring matches', () => {
    expect(filterPaletteItems(ITEMS, 'p').map((i) => i.id)).toEqual(['print', 'plan', 'auto']);
    expect(filterPaletteItems(ITEMS, 'go').map((i) => i.id)).toEqual(['guests', 'plan']);
    expect(filterPaletteItems(ITEMS, 'tdm').map((i) => i.id)).toEqual(['theme']);
  });

  it('is case-insensitive and trims', () => {
    expect(filterPaletteItems(ITEMS, '  PRINT ').map((i) => i.id)).toEqual(['print']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterPaletteItems(ITEMS, 'qwerty')).toEqual([]);
  });
});

describe('groupPaletteItems', () => {
  it('orders groups by their best-ranked item', () => {
    const groups = groupPaletteItems(filterPaletteItems(ITEMS, 'p'));
    expect(groups.map((g) => g.name)).toEqual(['Actions', 'Navigate']);
    expect(groups[0]!.items.map((i) => i.id)).toEqual(['print', 'auto']);
  });

  it('keeps items in rank order within a group', () => {
    const groups = groupPaletteItems(ITEMS);
    expect(groups[0]).toEqual({ name: 'Navigate', items: [ITEMS[0], ITEMS[1]] });
  });
});
