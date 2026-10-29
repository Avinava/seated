import type { Group, Guest, GuestId, Meal, Party, Rsvp, SeatingEvent, Tone } from '../model/types';
import { nextIdFor } from '../ops/ids';
import { normalizeTags } from '../ops/guests';
import { syncAccessRule } from '../ops/rules';

export const IMPORT_FIELDS = [
  'name',
  'email',
  'party',
  'group',
  'rsvp',
  'meal',
  'dietary',
  'tags',
  'access',
  'notes',
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

/** Column index for each field, or null when the file has no such column. */
export type ImportMapping = Record<ImportField, number | null>;

/** Header words for each field, most specific first. */
const SYNONYMS: Record<ImportField, readonly string[]> = {
  name: ['full name', 'guest name', 'name', 'guest', 'attendee'],
  email: ['email', 'e mail', 'email address', 'mail'],
  party: ['party', 'household', 'family', 'booking'],
  group: ['group', 'side', 'team', 'department'],
  rsvp: ['rsvp', 'status', 'attending', 'response', 'coming'],
  meal: ['meal', 'menu', 'food'],
  dietary: ['dietary', 'allergies', 'allergy', 'diet'],
  tags: ['tags', 'tag', 'labels'],
  access: ['access', 'wheelchair', 'step free', 'accessibility', 'mobility'],
  notes: ['notes', 'note', 'comments', 'remarks'],
};

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Guess which column holds which field. Exact header matches win over partial
 * ones, and every column is used at most once.
 */
export function suggestMapping(headers: readonly string[]): ImportMapping {
  const norm = headers.map(normalizeHeader);
  const mapping = Object.fromEntries(IMPORT_FIELDS.map((f) => [f, null])) as ImportMapping;
  const used = new Set<number>();
  const passes: ((header: string, word: string) => boolean)[] = [
    (h, w) => h === w,
    (h, w) => h.startsWith(`${w} `) || h.endsWith(` ${w}`) || h.includes(` ${w} `),
    (h, w) => h.replace(/ /g, '').includes(w.replace(/ /g, '')),
  ];
  for (const matches of passes) {
    for (const field of IMPORT_FIELDS) {
      if (mapping[field] !== null) continue;
      for (const word of SYNONYMS[field]) {
        const index = norm.findIndex((h, i) => !used.has(i) && h !== '' && matches(h, word));
        if (index >= 0) {
          mapping[field] = index;
          used.add(index);
          break;
        }
      }
    }
  }
  return mapping;
}

export type ImportErrorCode = 'missing-name' | 'bad-email' | 'unknown-rsvp' | 'unknown-meal';

export interface ImportError {
  readonly field: ImportField;
  readonly code: ImportErrorCode;
  /** The raw value that failed. */
  readonly value: string;
}

/** Normalized values from one row. Only fields present and valid in the file are set. */
export interface ImportValues {
  readonly name: string;
  readonly email?: string;
  readonly party?: string;
  readonly group?: string;
  readonly rsvp?: Rsvp;
  readonly meal?: Meal;
  readonly dietary?: string;
  readonly tags?: readonly string[];
  readonly access?: boolean;
  readonly notes?: string;
}

export interface ImportRow {
  /** Index of the row among the data rows (header excluded). */
  readonly index: number;
  readonly values: ImportValues;
  readonly errors: readonly ImportError[];
}

const RSVP_WORDS: Record<Rsvp, readonly string[]> = {
  accepted: ['accepted', 'accept', 'yes', 'y', 'attending', 'coming', 'confirmed', 'going', 'true', '1'],
  declined: ['declined', 'decline', 'no', 'n', 'not attending', 'not coming', 'regrets', 'false', '0'],
  pending: ['pending', 'maybe', 'tbc', 'tbd', 'unsure', 'invited', 'awaiting', 'no reply', 'unknown', '?'],
};

const MEAL_WORDS: Record<Meal, readonly string[]> = {
  veg: ['veg', 'vegetarian', 'v', 'veggie', 'pure veg'],
  'non-veg': ['non veg', 'nonveg', 'non vegetarian', 'nv', 'meat', 'chicken', 'fish', 'mutton'],
  jain: ['jain'],
  vegan: ['vegan', 'plant based'],
  other: ['other'],
};

const YES = new Set(['yes', 'y', 'true', '1', 'x', 'wheelchair', 'step free', 'needed', 'required']);

function words(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9?]+/g, ' ')
    .trim();
}

function lookup<K extends string>(table: Record<K, readonly string[]>, value: string): K | undefined {
  const w = words(value);
  for (const key of Object.keys(table) as K[]) if (table[key].includes(w)) return key;
  return undefined;
}

export function normalizeRsvp(value: string): Rsvp | undefined {
  return lookup(RSVP_WORDS, value);
}

export function normalizeMeal(value: string): Meal | undefined {
  return lookup(MEAL_WORDS, value);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@.]+$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value);
}

/** Turn raw rows into normalized values with per-field errors. Rows exclude the header. */
export function validateRows(
  rows: readonly (readonly string[])[],
  mapping: ImportMapping,
  _event?: SeatingEvent,
): ImportRow[] {
  return rows.map((row, index) => {
    const cell = (f: ImportField): string => {
      const i = mapping[f];
      return i === null ? '' : (row[i] ?? '').trim();
    };
    const errors: ImportError[] = [];
    const values: { -readonly [K in keyof ImportValues]: ImportValues[K] } = {
      name: cell('name').replace(/\s+/g, ' '),
    };
    if (values.name === '') errors.push({ field: 'name', code: 'missing-name', value: '' });

    const email = cell('email').toLowerCase();
    if (email !== '') {
      if (isEmail(email)) values.email = email;
      else errors.push({ field: 'email', code: 'bad-email', value: cell('email') });
    }
    const rsvp = cell('rsvp');
    if (rsvp !== '') {
      const r = normalizeRsvp(rsvp);
      if (r) values.rsvp = r;
      else errors.push({ field: 'rsvp', code: 'unknown-rsvp', value: rsvp });
    }
    const meal = cell('meal');
    if (meal !== '') {
      const m = normalizeMeal(meal);
      if (m) values.meal = m;
      else errors.push({ field: 'meal', code: 'unknown-meal', value: meal });
    }
    for (const f of ['party', 'group', 'dietary', 'notes'] as const) {
      const v = cell(f);
      if (v !== '') values[f] = v;
    }
    const tags = normalizeTags(cell('tags').split(/[,;|]/));
    if (tags.length > 0) values.tags = tags;
    const access = cell('access');
    if (access !== '') values.access = YES.has(words(access));
    return { index, values, errors };
  });
}

/** A row can be imported unless it has no name. Other bad values are simply left out. */
export function isImportable(row: ImportRow): boolean {
  return !row.errors.some((e) => e.code === 'missing-name');
}

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface Duplicate {
  readonly rowIndex: number;
  readonly guestId: GuestId;
  readonly by: 'email' | 'name';
}

/** Match rows to existing guests: by email (case-insensitive), else by normalized name. */
export function findDuplicates(rows: readonly ImportRow[], guests: readonly Guest[]): Duplicate[] {
  const byEmail = new Map<string, GuestId>();
  const byName = new Map<string, GuestId>();
  for (const g of guests) {
    const email = g.email.trim().toLowerCase();
    if (email !== '' && !byEmail.has(email)) byEmail.set(email, g.id);
    const name = normalizeName(g.name);
    if (name !== '' && !byName.has(name)) byName.set(name, g.id);
  }
  const out: Duplicate[] = [];
  for (const row of rows) {
    const emailMatch = row.values.email ? byEmail.get(row.values.email) : undefined;
    if (emailMatch) {
      out.push({ rowIndex: row.index, guestId: emailMatch, by: 'email' });
      continue;
    }
    const nameMatch = row.values.name ? byName.get(normalizeName(row.values.name)) : undefined;
    if (nameMatch) out.push({ rowIndex: row.index, guestId: nameMatch, by: 'name' });
  }
  return out;
}

export type DuplicateDecision = 'merge' | 'keep-both' | 'skip';

export interface ImportResult {
  readonly event: SeatingEvent;
  readonly added: readonly GuestId[];
  readonly merged: readonly GuestId[];
  /** Row indices that were not imported. */
  readonly skipped: readonly number[];
}

function key(label: string): string {
  return label.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Add rows to the event. Rows matching an existing guest follow `decisions`
 * (default 'skip'); other rows are added unless their decision is 'skip'. Rows
 * without a name are always skipped. Party and group labels reuse existing ones
 * case-insensitively; new groups take the next tone after the last group's.
 */
export function applyImport(
  event: SeatingEvent,
  rows: readonly ImportRow[],
  decisions: ReadonlyMap<number, DuplicateDecision> = new Map(),
): ImportResult {
  const dupes = new Map(findDuplicates(rows, event.guests).map((d) => [d.rowIndex, d.guestId]));
  const parties: Party[] = [...event.parties];
  const groups: Group[] = [...event.groups];
  const guests: Guest[] = [...event.guests];
  const added: GuestId[] = [];
  const merged: GuestId[] = [];
  const skipped: number[] = [];
  const accessChanges: [GuestId, boolean][] = [];

  const partyFor = (label: string): string => {
    const found = parties.find((p) => key(p.label) === key(label));
    if (found) return found.id;
    const party: Party = { id: nextIdFor('party', parties), label: label.trim() };
    parties.push(party);
    return party.id;
  };
  const groupFor = (label: string): string => {
    const found = groups.find((g) => key(g.label) === key(label));
    if (found) return found.id;
    const last = groups.at(-1)?.tone ?? 0;
    const group: Group = { id: nextIdFor('group', groups), label: label.trim(), tone: ((last % 4) + 1) as Tone };
    groups.push(group);
    return group.id;
  };

  for (const row of rows) {
    const existing = dupes.get(row.index);
    const decision = decisions.get(row.index) ?? (existing ? 'skip' : 'keep-both');
    if (!isImportable(row) || decision === 'skip') {
      skipped.push(row.index);
      continue;
    }
    const v = row.values;
    const patch: Partial<Guest> = {
      ...(v.email !== undefined && { email: v.email }),
      ...(v.rsvp !== undefined && { rsvp: v.rsvp }),
      ...(v.meal !== undefined && { meal: v.meal }),
      ...(v.dietary !== undefined && { dietary: v.dietary }),
      ...(v.access !== undefined && { access: v.access }),
      ...(v.notes !== undefined && { notes: v.notes }),
      ...(v.party !== undefined && { partyId: partyFor(v.party) }),
      ...(v.group !== undefined && { groupId: groupFor(v.group) }),
    };
    const i = existing && decision === 'merge' ? guests.findIndex((g) => g.id === existing) : -1;
    const current = guests[i];
    if (current) {
      const tags = v.tags ? normalizeTags([...current.tags, ...v.tags]) : current.tags;
      const next: Guest = { ...current, ...patch, tags };
      guests[i] = next.rsvp === 'declined' ? { ...next, seat: null } : next;
      merged.push(current.id);
      if (v.access !== undefined) accessChanges.push([current.id, v.access]);
      continue;
    }
    const id = nextIdFor('guest', guests);
    const groupId = patch.groupId ?? groups[0]?.id ?? groupFor('Guests');
    guests.push({
      id,
      name: v.name,
      email: '',
      partyId: null,
      rsvp: 'pending',
      meal: 'veg',
      dietary: '',
      tags: v.tags ?? [],
      access: false,
      plusOneOf: null,
      notes: '',
      ...patch,
      groupId,
      seat: null,
    });
    added.push(id);
    if (v.access) accessChanges.push([id, true]);
  }

  let next: SeatingEvent = { ...event, guests, parties, groups };
  for (const [id, access] of accessChanges) next = syncAccessRule(next, id, access);
  return { event: added.length + merged.length > 0 ? next : event, added, merged, skipped };
}
