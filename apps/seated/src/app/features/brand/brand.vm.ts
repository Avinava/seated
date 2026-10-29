import type { TableShape } from '@seated/domain';
import { COLOR_TOKENS, RADII, TYPE_SCALE, type ColorToken, type SeatState, type SeatView } from '@seated/kit';

export interface SwatchGroup {
  readonly id: string;
  readonly label: string;
  readonly tokens: readonly ColorToken[];
}

const GROUPS: readonly { id: string; label: string; test: (name: string) => boolean }[] = [
  {
    id: 'neutrals',
    label: $localize`:@@brand.group.neutrals:Surfaces and lines`,
    test: (n) => /^(bg|surface|line|dot|scrim|selection)/.test(n),
  },
  { id: 'text', label: $localize`:@@brand.group.text:Text`, test: (n) => /^text/.test(n) },
  { id: 'accent', label: $localize`:@@brand.group.accent:Accent`, test: (n) => /accent/.test(n) },
  { id: 'status', label: $localize`:@@brand.group.status:Status`, test: (n) => /^(ok|warn|danger)/.test(n) },
  { id: 'cat', label: $localize`:@@brand.group.cat:Guest groups`, test: (n) => /^cat-/.test(n) },
];

/** Colour tokens in display groups, in token order within each. Every token lands in exactly one group. */
export function swatchGroups(tokens: readonly ColorToken[] = COLOR_TOKENS): SwatchGroup[] {
  const placed = new Set<string>();
  const groups = GROUPS.map((g) => {
    const list = tokens.filter((t) => !placed.has(t.name) && g.test(t.name));
    list.forEach((t) => placed.add(t.name));
    return { id: g.id, label: g.label, tokens: list };
  });
  const rest = tokens.filter((t) => !placed.has(t.name));
  if (rest.length) groups.push({ id: 'other', label: $localize`:@@brand.group.other:Other`, tokens: rest });
  return groups.filter((g) => g.tokens.length);
}

/**
 * Every colour token set to one theme's value, as custom properties for a
 * style binding. Kit components inside an element carrying these render in
 * that theme whatever the page theme is, which lets the guide show light and
 * dark side by side from the real token values.
 */
export function themeVars(
  mode: 'light' | 'dark',
  tokens: readonly ColorToken[] = COLOR_TOKENS,
): Record<string, string> {
  return Object.fromEntries([...tokens.map((t) => [t.cssVar, t[mode]]), ['color-scheme', mode]]);
}

export interface TypeStep {
  readonly name: string;
  readonly size: string;
  readonly cssVar: string;
}

/** The type scale, largest first. */
export function typeSteps(scale: Record<string, string> = TYPE_SCALE): TypeStep[] {
  return Object.entries(scale)
    .map(([name, size]) => ({ name, size, cssVar: `--st-fs-${name}` }))
    .sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
}

export function radiusSteps(radii: Record<string, string> = RADII): { name: string; value: string; cssVar: string }[] {
  return Object.entries(radii).map(([name, value]) => ({ name, value, cssVar: `--st-radius-${name}` }));
}

export interface SeatSample {
  readonly state: SeatState;
  readonly title: string;
  readonly signal: string;
  readonly initials: string;
}

/** Every seat state, with the cue that carries it besides colour. */
export const SEAT_SAMPLES: readonly SeatSample[] = [
  {
    state: 'empty',
    title: $localize`:@@brand.seat.empty:Empty`,
    signal: $localize`:@@brand.seat.emptySignal:Dashed border, no initials`,
    initials: '',
  },
  {
    state: 'filled',
    title: $localize`:@@brand.seat.filled:Seated`,
    signal: $localize`:@@brand.seat.filledSignal:Solid border, initials`,
    initials: 'RK',
  },
  {
    state: 'picked',
    title: $localize`:@@brand.seat.picked:Picked up`,
    signal: $localize`:@@brand.seat.pickedSignal:Adds a 3px outer ring`,
    initials: 'RK',
  },
  {
    state: 'drop-target',
    title: $localize`:@@brand.seat.drop:Drop here`,
    signal: $localize`:@@brand.seat.dropSignal:Grows 16% with a solid border`,
    initials: '',
  },
  {
    state: 'conflict',
    title: $localize`:@@brand.seat.conflict:Conflict`,
    signal: $localize`:@@brand.seat.conflictSignal:Thicker border and a wide halo`,
    initials: 'DM',
  },
];

const NAMES = ['AS', 'KM', 'RK', 'DM', 'PN', 'FQ', 'IQ', 'LI', 'TB', 'ZA', 'MF', 'JD'];

/** Demo seats for a table: filled in group tones, with a gap or two and one picked seat. */
export function demoSeats(count: number, picked = -1, gaps: readonly number[] = []): SeatView[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    if (gaps.includes(i))
      return { initials: '', tone: null, state: 'empty', label: $localize`:@@brand.demoEmpty:Seat ${n}:n:, empty` };
    const initials = NAMES[i % NAMES.length] ?? '';
    return {
      initials,
      tone: ((i % 4) + 1) as 1 | 2 | 3 | 4,
      state: i === picked ? 'picked' : 'filled',
      label: $localize`:@@brand.demoSeat:Seat ${n}:n:, ${initials}:who:`,
    };
  });
}

export interface TableSample {
  readonly shape: TableShape;
  readonly label: string;
  readonly caption: string;
  readonly seats: readonly SeatView[];
}

export const TABLE_SAMPLES: readonly TableSample[] = [
  {
    shape: 'round',
    label: 'T3',
    caption: $localize`:@@brand.table.round:Round, 8 seats. Seats run clockwise from twelve o'clock.`,
    seats: demoSeats(8, 2, [5]),
  },
  {
    shape: 'long',
    label: 'A',
    caption: $localize`:@@brand.table.long:Long, 10 seats. One side fills, then the other.`,
    seats: demoSeats(10, -1, [4, 9]),
  },
  {
    shape: 'head',
    label: 'Head',
    caption: $localize`:@@brand.table.head:Head, 6 seats. One side, facing the room.`,
    seats: demoSeats(6),
  },
];
