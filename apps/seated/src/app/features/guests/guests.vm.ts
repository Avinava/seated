import { MEALS, RSVPS, type Meal, type Rsvp, type SeatingEvent, type Tone } from '@seated/domain';
import { gridGroup, type GridRow, type GridSort, type GridSortDir, type StTone } from '@seated/kit';
import { MEAL_LABEL, RSVP_LABEL, count, initials } from '../../i18n/messages';

/** One line of the guest table: a guest with every label resolved, ready to show, filter and sort. */
export interface GuestRow {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly email: string;
  readonly tone: Tone;
  readonly groupId: string;
  readonly groupLabel: string;
  readonly partyId: string | null;
  readonly partyLabel: string;
  readonly rsvp: Rsvp;
  readonly meal: Meal;
  /** A dietary note is on file, which "Other" needs. */
  readonly hasDietary: boolean;
  readonly tags: readonly string[];
  readonly tableId: string | null;
  /** Table label, or '' when unseated. */
  readonly tableLabel: string;
  /** Position of the table in the plan, for a natural table sort. Unseated sorts last. */
  readonly tableOrder: number;
  readonly access: boolean;
  /** Name of the guest this one is a plus-one of. */
  readonly plusOneOf: string | null;
  /** Lowercased text the search box matches against. */
  readonly haystack: string;
}

/** The value of the `guest` query param that opens an empty guest form. */
export const NEW_GUEST = 'new';

export type GroupBy = 'none' | 'party' | 'group' | 'rsvp' | 'meal' | 'table';
export const GROUP_BYS: readonly GroupBy[] = ['none', 'party', 'group', 'rsvp', 'meal', 'table'];

export type SortKey = 'name' | 'party' | 'group' | 'rsvp' | 'meal' | 'table';
export const SORT_KEYS: readonly SortKey[] = ['name', 'party', 'group', 'rsvp', 'meal', 'table'];

/** The table view as the URL describes it. Every field has a safe default. */
export interface GuestQuery {
  readonly q: string;
  readonly rsvp: Rsvp | null;
  readonly group: string | null;
  readonly meal: Meal | null;
  readonly tag: string | null;
  readonly by: GroupBy;
  readonly sort: GridSort | null;
}

/** Raw query params, exactly as the router hands them over. */
export interface GuestQueryParams {
  readonly q?: string | null;
  readonly rsvp?: string | null;
  readonly group?: string | null;
  readonly meal?: string | null;
  readonly tag?: string | null;
  readonly by?: string | null;
  readonly sort?: string | null;
}

export const EMPTY_QUERY: GuestQuery = {
  q: '',
  rsvp: null,
  group: null,
  meal: null,
  tag: null,
  by: 'none',
  sort: null,
};

const isIn = <T extends string>(list: readonly T[], v: string | null | undefined): v is T =>
  v !== null && v !== undefined && (list as readonly string[]).includes(v);

/** "name:asc" to a grid sort; anything unknown means "list order". */
export function parseSort(raw: string | null | undefined): GridSort | null {
  const [key, dir] = (raw ?? '').split(':');
  if (!isIn(SORT_KEYS, key)) return null;
  return { key, dir: dir === 'desc' ? 'desc' : 'asc' };
}

export function formatSort(sort: GridSort | null): string | null {
  return sort ? `${sort.key}:${sort.dir}` : null;
}

/** Turn whatever is in the URL into a query. Bad values fall back to defaults instead of failing. */
export function parseQuery(p: GuestQueryParams): GuestQuery {
  return {
    q: (p.q ?? '').trim(),
    rsvp: isIn(RSVPS, p.rsvp) ? p.rsvp : null,
    group: p.group || null,
    meal: isIn(MEALS, p.meal) ? p.meal : null,
    tag: p.tag || null,
    by: isIn(GROUP_BYS, p.by) ? p.by : 'none',
    sort: parseSort(p.sort),
  };
}

/** True when any filter narrows the list (grouping and sorting do not). */
export function isFiltered(q: GuestQuery): boolean {
  return q.q !== '' || q.rsvp !== null || q.group !== null || q.meal !== null || q.tag !== null;
}

export function toRows(event: SeatingEvent): GuestRow[] {
  const groups = new Map(event.groups.map((g) => [g.id, g]));
  const parties = new Map(event.parties.map((p) => [p.id, p.label]));
  const tables = new Map(event.tables.map((t, i) => [t.id, { label: t.label, order: i }]));
  const names = new Map(event.guests.map((g) => [g.id, g.name]));
  return event.guests.map((g) => {
    const group = groups.get(g.groupId);
    const table = g.seat ? tables.get(g.seat.tableId) : undefined;
    const partyLabel = (g.partyId && parties.get(g.partyId)) || '';
    return {
      id: g.id,
      name: g.name,
      initials: initials(g.name),
      email: g.email,
      tone: group?.tone ?? 1,
      groupId: g.groupId,
      groupLabel: group?.label ?? '',
      partyId: g.partyId,
      partyLabel,
      rsvp: g.rsvp,
      meal: g.meal,
      hasDietary: g.dietary.trim() !== '',
      tags: g.tags,
      tableId: table ? (g.seat?.tableId ?? null) : null,
      tableLabel: table?.label ?? '',
      tableOrder: table?.order ?? Number.MAX_SAFE_INTEGER,
      access: g.access,
      plusOneOf: g.plusOneOf ? (names.get(g.plusOneOf) ?? null) : null,
      haystack: [g.name, g.email, partyLabel, group?.label ?? '', table?.label ?? '', ...g.tags]
        .join(' ')
        .toLowerCase(),
    };
  });
}

/** Every search word has to appear somewhere in the row. */
function matchesText(row: GuestRow, words: readonly string[]): boolean {
  return words.every((w) => row.haystack.includes(w));
}

/** Filter by everything in the query except, optionally, RSVP (for the RSVP tab counts). */
export function filterRows(rows: readonly GuestRow[], q: GuestQuery, opts: { ignoreRsvp?: boolean } = {}): GuestRow[] {
  const words = q.q.toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter(
    (r) =>
      (opts.ignoreRsvp || q.rsvp === null || r.rsvp === q.rsvp) &&
      (q.group === null || r.groupId === q.group) &&
      (q.meal === null || r.meal === q.meal) &&
      (q.tag === null || r.tags.includes(q.tag)) &&
      (words.length === 0 || matchesText(r, words)),
  );
}

export interface RsvpCounts {
  readonly all: number;
  readonly accepted: number;
  readonly pending: number;
  readonly declined: number;
}

export function rsvpCounts(rows: readonly GuestRow[]): RsvpCounts {
  const c = { all: rows.length, accepted: 0, pending: 0, declined: 0 };
  for (const r of rows) c[r.rsvp]++;
  return c;
}

const collator = new Intl.Collator('en-IN', { sensitivity: 'base', numeric: true });

/** Compare two rows on one key. Blank values (no party, unseated) sort after real ones either way. */
function compareBy(key: SortKey, a: GuestRow, b: GuestRow, dir: GridSortDir): number {
  const sign = dir === 'asc' ? 1 : -1;
  const text = (x: string, y: string) => {
    if (x === '' || y === '') return x === y ? 0 : x === '' ? 1 : -1;
    return collator.compare(x, y) * sign;
  };
  switch (key) {
    case 'name':
      return collator.compare(a.name, b.name) * sign;
    case 'party':
      return text(a.partyLabel, b.partyLabel);
    case 'group':
      return text(a.groupLabel, b.groupLabel);
    case 'rsvp':
      return (RSVPS.indexOf(a.rsvp) - RSVPS.indexOf(b.rsvp)) * sign;
    case 'meal':
      return (MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal)) * sign;
    case 'table':
      if (a.tableId === null || b.tableId === null) return a.tableId === b.tableId ? 0 : a.tableId === null ? 1 : -1;
      return (a.tableOrder - b.tableOrder) * sign;
  }
}

/** Stable sort; ties fall back to name so the order never jitters. */
export function sortRows(rows: readonly GuestRow[], sort: GridSort | null): GuestRow[] {
  if (!sort || !isIn(SORT_KEYS, sort.key)) return [...rows];
  const key = sort.key;
  return [...rows].sort((a, b) => compareBy(key, a, b, sort.dir) || collator.compare(a.name, b.name));
}

interface Bucket {
  readonly id: string;
  readonly label: string;
  readonly order: number;
}

function bucketOf(by: Exclude<GroupBy, 'none'>, row: GuestRow, event: SeatingEvent): Bucket {
  switch (by) {
    case 'party':
      return row.partyId
        ? { id: row.partyId, label: row.partyLabel, order: 0 }
        : { id: '-', label: $localize`:@@guests.noParty:No party`, order: 1 };
    case 'group':
      return { id: row.groupId, label: row.groupLabel, order: event.groups.findIndex((g) => g.id === row.groupId) };
    case 'rsvp':
      return { id: row.rsvp, label: RSVP_LABEL[row.rsvp], order: RSVPS.indexOf(row.rsvp) };
    case 'meal':
      return { id: row.meal, label: MEAL_LABEL[row.meal], order: MEALS.indexOf(row.meal) };
    case 'table':
      return row.tableId
        ? { id: row.tableId, label: row.tableLabel, order: row.tableOrder }
        : { id: '-', label: $localize`:@@guests.unseated:Unseated`, order: Number.MAX_SAFE_INTEGER };
  }
}

/**
 * Insert a heading before each bucket. Rows keep their sorted order inside a
 * bucket; buckets follow the natural order of their kind (RSVP order, plan
 * order for tables, A to Z for parties), with the "none" bucket last.
 */
export function groupRows(rows: readonly GuestRow[], by: GroupBy, event: SeatingEvent): GridRow<GuestRow>[] {
  if (by === 'none') return [...rows];
  const buckets = new Map<string, { bucket: Bucket; rows: GuestRow[] }>();
  for (const row of rows) {
    const bucket = bucketOf(by, row, event);
    const entry = buckets.get(bucket.id);
    if (entry) entry.rows.push(row);
    else buckets.set(bucket.id, { bucket, rows: [row] });
  }
  const ordered = [...buckets.values()].sort(
    (a, b) => a.bucket.order - b.bucket.order || collator.compare(a.bucket.label, b.bucket.label),
  );
  return ordered.flatMap(({ bucket, rows: members }) => [
    gridGroup(`${by}:${bucket.id}`, bucket.label, members.length),
    ...members,
  ]);
}

/** The whole pipeline: filter, sort, group. */
export function viewRows(rows: readonly GuestRow[], q: GuestQuery, event: SeatingEvent): GridRow<GuestRow>[] {
  return groupRows(sortRows(filterRows(rows, q), q.sort), q.by, event);
}

export const RSVP_TONE: Record<Rsvp, StTone> = { accepted: 'ok', pending: 'warn', declined: 'danger' };

/** "1 guest", "1,200 guests". */
export function guestCount(n: number): string {
  return n === 1 ? $localize`:@@guests.countOne:1 guest` : $localize`:@@guests.countMany:${count(n)}:count: guests`;
}

/** "120 guests · 100 coming · 84 seated", for the page header. */
export function summary(event: SeatingEvent): string {
  const coming = event.guests.filter((g) => g.rsvp === 'accepted').length;
  const seated = event.guests.filter((g) => g.seat !== null).length;
  return $localize`:@@guests.summary:${guestCount(event.guests.length)}:guests: · ${count(coming)}:coming: coming · ${count(seated)}:seated: seated`;
}

/** "12 of 120 shown". */
export function shownText(shown: number, total: number): string {
  return $localize`:@@guests.shown:${count(shown)}:shown: of ${count(total)}:total: shown`;
}

/** Every tag in use, A to Z. */
export function tagsInUse(event: SeatingEvent): string[] {
  return [...new Set(event.guests.flatMap((g) => g.tags))].sort(collator.compare);
}

export interface TableOption {
  readonly id: string;
  readonly label: string;
  readonly free: number;
  /** "T3 · 2 free", "T5 · full". */
  readonly text: string;
}

export function tableOptions(event: SeatingEvent): TableOption[] {
  const taken = new Map<string, number>();
  for (const g of event.guests) if (g.seat) taken.set(g.seat.tableId, (taken.get(g.seat.tableId) ?? 0) + 1);
  return event.tables.map((t) => {
    const free = Math.max(0, t.seats - (taken.get(t.id) ?? 0));
    const text =
      free === 0
        ? $localize`:@@guests.table.full:${t.label}:table: · full`
        : $localize`:@@guests.table.free:${t.label}:table: · ${count(free)}:free: free`;
    return { id: t.id, label: t.label, free, text };
  });
}

/** Short undo labels: "set 3 guests to Coming". */
export const LABELS = {
  setRsvp: (who: string, rsvp: Rsvp) => $localize`:@@guests.cmd.setRsvp:set ${who}:who: to ${RSVP_LABEL[rsvp]}:rsvp:`,
  setMeal: (who: string, meal: Meal) => $localize`:@@guests.cmd.setMeal:set ${who}:who: to ${MEAL_LABEL[meal]}:meal:`,
  addTag: (who: string, tag: string) => $localize`:@@guests.cmd.addTag:tag ${who}:who: ${tag}:tag:`,
  assign: (who: string, table: string) => $localize`:@@guests.cmd.assign:seat ${who}:who: at ${table}:table:`,
  remove: (who: string) => $localize`:@@guests.cmd.remove:remove ${who}:who:`,
};

/** A guest's name for one, "3 guests" for many. */
export function who(rows: readonly { readonly name: string }[]): string {
  const [only] = rows;
  return rows.length === 1 && only ? only.name : guestCount(rows.length);
}

/** Capitalise the first letter, for a done message built from an undo label. */
export function sentence(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}
