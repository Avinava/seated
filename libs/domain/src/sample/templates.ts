import type { EventKind, FloorPlan, Group, SeatingEvent, Table, TableShape, Zone } from '../model/types';

export const PLAN_SIZE = { width: 1180, height: 700 } as const;

const EXIT: Zone = { kind: 'exit', label: 'Exit', x: 1150, y: 290, w: 30, h: 140 };
const ENTRANCE: Zone = { kind: 'entrance', label: 'Entrance', x: 500, y: 670, w: 180, h: 30 };
const STAGE: Zone = { kind: 'stage', label: 'Stage', x: 470, y: 10, w: 240, h: 50 };

function plan(zones: readonly Zone[]): FloorPlan {
  return { ...PLAN_SIZE, zones };
}

function t(
  id: string,
  label: string,
  shape: TableShape,
  seats: number,
  x: number,
  y: number,
  rotation: 0 | 90 = 0,
): Table {
  return { id, label, shape, seats, x, y, rotation };
}

/** Round tables on a grid, numbered from the exit side (right) so T1 and T(n+1) sit by the exit. */
function grid(columns: number, rows: number, seats: number, xs: readonly number[], ys: readonly number[]): Table[] {
  const out: Table[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const n = r * columns + c + 1;
      out.push(t(`t-${n}`, `T${n}`, 'round', seats, xs[c] ?? 0, ys[r] ?? 0));
    }
  }
  return out;
}

export interface Layout {
  readonly tables: readonly Table[];
  readonly plan: FloorPlan;
  readonly groups: readonly Group[];
}

export const WEDDING_GROUPS: readonly Group[] = [
  { id: 'grp-1', label: "Bride's family", tone: 1 },
  { id: 'grp-2', label: "Groom's family", tone: 2 },
  { id: 'grp-3', label: 'Friends', tone: 3 },
  { id: 'grp-4', label: 'Work', tone: 4 },
];

/** Head table under the stage, T1-T8 in two rows, two long tables on the left. */
export function weddingLayout(): Layout {
  return {
    groups: WEDDING_GROUPS,
    tables: [
      t('t-head', 'Head', 'head', 8, 590, 130),
      ...grid(4, 2, 10, [1000, 820, 640, 460], [390, 570]),
      t('t-long-a', 'Long A', 'long', 12, 90, 450),
      t('t-long-b', 'Long B', 'long', 12, 240, 450),
    ],
    plan: plan([
      STAGE,
      { kind: 'dance-floor', label: 'Dance floor', x: 440, y: 190, w: 300, h: 110 },
      { kind: 'bar', label: 'Bar', x: 30, y: 30, w: 200, h: 70 },
      EXIT,
      ENTRANCE,
    ]),
  };
}

export function birthdayLayout(): Layout {
  return {
    groups: [
      { id: 'grp-1', label: 'Family', tone: 1 },
      { id: 'grp-2', label: 'School friends', tone: 2 },
      { id: 'grp-3', label: 'College', tone: 3 },
      { id: 'grp-4', label: 'Work', tone: 4 },
    ],
    tables: [
      t('t-1', 'L1', 'long', 10, 330, 200, 90),
      t('t-2', 'L2', 'long', 10, 330, 380, 90),
      t('t-3', 'L3', 'long', 10, 330, 560, 90),
      t('t-4', 'T1', 'round', 6, 1000, 360),
    ],
    plan: plan([
      { kind: 'bar', label: 'Bar', x: 700, y: 30, w: 300, h: 70 },
      { kind: 'dance-floor', label: 'Dance floor', x: 620, y: 300, w: 220, h: 160 },
      EXIT,
      ENTRANCE,
    ]),
  };
}

export function officeLayout(): Layout {
  return {
    groups: [
      { id: 'grp-1', label: 'Engineering', tone: 1 },
      { id: 'grp-2', label: 'Design', tone: 2 },
      { id: 'grp-3', label: 'Sales', tone: 3 },
      { id: 'grp-4', label: 'Operations', tone: 4 },
    ],
    tables: grid(4, 2, 10, [1000, 800, 600, 400], [260, 480]),
    plan: plan([STAGE, { kind: 'bar', label: 'Bar', x: 30, y: 300, w: 120, h: 200 }, EXIT, ENTRANCE]),
  };
}

export function conferenceLayout(): Layout {
  return {
    groups: [
      { id: 'grp-1', label: 'Speakers', tone: 1 },
      { id: 'grp-2', label: 'Attendees', tone: 2 },
      { id: 'grp-3', label: 'Sponsors', tone: 3 },
      { id: 'grp-4', label: 'Organisers', tone: 4 },
    ],
    tables: grid(5, 2, 8, [1000, 820, 640, 460, 280], [260, 480]),
    plan: plan([STAGE, EXIT, ENTRANCE]),
  };
}

export function otherLayout(): Layout {
  return {
    groups: [{ id: 'grp-1', label: 'Guests', tone: 1 }],
    tables: grid(3, 2, 10, [1000, 780, 560], [260, 480]),
    plan: plan([EXIT, ENTRANCE]),
  };
}

export function layoutFor(kind: EventKind): Layout {
  switch (kind) {
    case 'wedding':
      return weddingLayout();
    case 'birthday':
      return birthdayLayout();
    case 'office':
      return officeLayout();
    case 'conference':
      return conferenceLayout();
    case 'other':
      return otherLayout();
  }
}

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'event'
  );
}

/**
 * A new, empty event with a sensible layout and groups for its kind. The id is
 * derived from the name and time unless given.
 */
export function createFromTemplate(kind: EventKind, name: string, date: string, now: Date, id?: string): SeatingEvent {
  const layout = layoutFor(kind);
  const stamp = now.toISOString();
  return {
    id: id ?? `ev-${slug(name)}-${now.getTime().toString(36)}`,
    name: name.trim(),
    kind,
    date,
    venue: '',
    city: '',
    groups: layout.groups,
    parties: [],
    guests: [],
    tables: layout.tables,
    rules: [],
    plan: layout.plan,
    createdAt: stamp,
    updatedAt: stamp,
  };
}
