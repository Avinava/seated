/**
 * Pure view-model functions for the seating screen. No Angular, no stores:
 * everything here takes plain domain data and returns what a template binds,
 * so it is covered by table-driven specs.
 */
import {
  seatGuests,
  seatsAt,
  tableBounds,
  type Explanation,
  type Group,
  type Guest,
  type GuestId,
  type Meal,
  type Party,
  type PartyId,
  type Rsvp,
  type SeatRef,
  type SeatingEvent,
  type Table,
  type TableShape,
  type Tone,
} from '@seated/domain';
import type { SeatState, SeatView, SegmentedOption } from '@seated/kit';
import { MEAL_LABEL, RSVP_LABEL, count, explain, initials, plural } from '../../i18n/messages';

export type ColorBy = 'group' | 'meal' | 'rsvp';

export const COLOR_OPTIONS: readonly SegmentedOption<ColorBy>[] = [
  { value: 'group', label: $localize`:@@colours.group:Group` },
  { value: 'meal', label: $localize`:@@colours.meal:Meal` },
  { value: 'rsvp', label: $localize`:@@colours.rsvp:RSVP` },
];

/** "t-3:4": a stable key for one seat. */
export type SeatKey = string;

export function seatKey(seat: SeatRef): SeatKey {
  return `${seat.tableId}:${seat.index}`;
}

/** Meals map onto the four category tones; "other" stays neutral. */
export const MEAL_TONE: Record<Meal, Tone | null> = { veg: 1, 'non-veg': 2, jain: 3, vegan: 4, other: null };

/** Coming is teal, awaiting is amber, declined is neutral. */
export const RSVP_TONE: Record<Rsvp, Tone | null> = { accepted: 1, pending: 2, declined: null };

export function toneFor(guest: Guest, colorBy: ColorBy, groups: ReadonlyMap<string, Group>): Tone | null {
  switch (colorBy) {
    case 'group':
      return groups.get(guest.groupId)?.tone ?? null;
    case 'meal':
      return MEAL_TONE[guest.meal];
    case 'rsvp':
      return RSVP_TONE[guest.rsvp];
  }
}

export interface LegendItem {
  readonly label: string;
  readonly tone: Tone | null;
}

export function legend(colorBy: ColorBy, groups: readonly Group[]): LegendItem[] {
  switch (colorBy) {
    case 'group':
      return groups.map((g) => ({ label: g.label, tone: g.tone }));
    case 'meal':
      return (Object.keys(MEAL_TONE) as Meal[]).map((m) => ({ label: MEAL_LABEL[m], tone: MEAL_TONE[m] }));
    case 'rsvp':
      return (['accepted', 'pending'] as const).map((r) => ({ label: RSVP_LABEL[r], tone: RSVP_TONE[r] }));
  }
}

/** What the seats of one table need to know about the rest of the screen. */
export interface SeatContext {
  readonly colorBy: ColorBy;
  readonly groups: ReadonlyMap<string, Group>;
  /** Guests with at least one rule conflict. */
  readonly conflicts: ReadonlySet<GuestId>;
  /** Guests being held (picked up or dragged). */
  readonly held: ReadonlySet<GuestId>;
  /** Seats where a drop would land right now. */
  readonly preview: ReadonlySet<SeatKey>;
  /** Seats filled a moment ago, playing the pop and glow. */
  readonly justPlaced: ReadonlySet<SeatKey>;
  /** Guests singled out from the rules list or the palette. */
  readonly highlight: ReadonlySet<GuestId>;
}

export const EMPTY_SEAT_CONTEXT: SeatContext = {
  colorBy: 'group',
  groups: new Map(),
  conflicts: new Set(),
  held: new Set(),
  preview: new Set(),
  justPlaced: new Set(),
  highlight: new Set(),
};

function seatState(guest: Guest | null, key: SeatKey, ctx: SeatContext): SeatState {
  if (ctx.preview.has(key)) return 'drop-target';
  if (!guest) return 'empty';
  if (ctx.held.has(guest.id)) return 'picked';
  // A conflict already stands out; a highlight never hides it.
  if (ctx.conflicts.has(guest.id)) return 'conflict';
  if (ctx.highlight.has(guest.id)) return 'picked';
  return 'filled';
}

/** One table's seats as the kit renders them. */
export function seatViews(table: Table, guests: readonly Guest[], ctx: SeatContext): SeatView[] {
  return seatsAt(table, guests).map((guest, index) => {
    const key = seatKey({ tableId: table.id, index });
    const state = seatState(guest, key, ctx);
    const n = index + 1;
    const parts = [
      guest
        ? $localize`:@@seat.filled:Seat ${n}:n:, ${guest.name}:name:`
        : $localize`:@@seat.empty:Seat ${n}:n:, empty`,
    ];
    if (guest && ctx.conflicts.has(guest.id)) parts.push($localize`:@@seat.conflict:breaks a rule`);
    if (guest && ctx.held.has(guest.id)) parts.push($localize`:@@seat.held:being moved`);
    else if (guest && ctx.highlight.has(guest.id)) parts.push($localize`:@@seat.highlight:highlighted`);
    if (state === 'drop-target') parts.push($localize`:@@seat.dropHere:drop lands here`);
    return {
      initials: guest ? initials(guest.name) : '',
      tone: guest ? toneFor(guest, ctx.colorBy, ctx.groups) : null,
      state,
      label: parts.join(', '),
      justPlaced: ctx.justPlaced.has(key),
    };
  });
}

/** "T3" reads as "Table 3"; "Head" as "Head table"; anything naming a table stays as is. */
export function spokenTableName(label: string): string {
  const numbered = /^T(\d+)$/i.exec(label.trim());
  if (numbered?.[1]) return $localize`:@@table.numbered:Table ${numbered[1]}:n:`;
  return /table/i.test(label) ? label : $localize`:@@table.named:${label}:label: table`;
}

/** "Table 3, 7 of 10 seated, 1 conflict, near the exit". */
export function tableAriaLabel(table: Table, filled: number, conflicts: number, nearExit: boolean): string {
  const parts = [
    spokenTableName(table.label),
    $localize`:@@table.filled:${filled}:filled: of ${table.seats}:seats: seated`,
  ];
  if (conflicts > 0) {
    parts.push(
      conflicts === 1
        ? $localize`:@@table.conflictOne:1 conflict`
        : $localize`:@@table.conflictMany:${conflicts}:n: conflicts`,
    );
  }
  if (nearExit) parts.push($localize`:@@table.nearExit:near the exit`);
  return parts.join(', ');
}

/**
 * Tables in reading order: rows top to bottom (centres within `band` units
 * count as one row), then left to right. This is the keyboard order on the plan.
 */
export function readingOrder(tables: readonly Table[], band = 80): Table[] {
  const byY = [...tables].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: Table[][] = [];
  for (const t of byY) {
    const row = rows.at(-1);
    const first = row?.[0];
    if (row && first && t.y - first.y < band) row.push(t);
    else rows.push([t]);
  }
  return rows.flatMap((r) => r.sort((a, b) => a.x - b.x));
}

/** One household (or a guest on their own) in the unseated list. */
export interface UnseatedGroup {
  readonly key: string;
  readonly partyId: PartyId | null;
  readonly label: string;
  /** Unseated members shown in this group, in list order. */
  readonly members: readonly Guest[];
  readonly tone: Tone | null;
  readonly pending: boolean;
}

function matches(guest: Guest, party: Party | undefined, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return guest.name.toLowerCase().includes(q) || (party?.label.toLowerCase().includes(q) ?? false);
}

/**
 * Unseated guests who are coming (or awaiting, listed after), grouped by
 * party. A filter keeps a household together when its name matches.
 */
export function unseatedGroups(
  event: Pick<SeatingEvent, 'guests' | 'parties' | 'groups'>,
  query: string,
  colorBy: ColorBy = 'group',
): UnseatedGroup[] {
  const parties = new Map(event.parties.map((p) => [p.id, p]));
  const groups = new Map(event.groups.map((g) => [g.id, g]));
  const out = new Map<string, { partyId: PartyId | null; members: Guest[] }>();
  const q = query.trim();
  for (const g of event.guests) {
    if (g.seat !== null || g.rsvp === 'declined') continue;
    const party = g.partyId === null ? undefined : parties.get(g.partyId);
    if (!matches(g, party, q)) continue;
    const key = `${g.rsvp === 'pending' ? 'p' : 'a'}:${g.partyId ?? `guest:${g.id}`}`;
    const entry = out.get(key) ?? { partyId: g.partyId, members: [] };
    entry.members.push(g);
    out.set(key, entry);
  }
  const list = [...out.entries()].map(([key, { partyId, members }]): UnseatedGroup => {
    const first = members[0];
    const label = (partyId !== null ? parties.get(partyId)?.label : undefined) ?? first?.name ?? '';
    return {
      key,
      partyId,
      label,
      members,
      tone: first ? toneFor(first, colorBy, groups) : null,
      pending: first?.rsvp === 'pending',
    };
  });
  return list.sort((a, b) => Number(a.pending) - Number(b.pending));
}

/** What a hold or drag carries: who, and how to name them. */
export interface Payload {
  readonly guestIds: readonly GuestId[];
  /** "the Mehtas" or "Aarav Shah". */
  readonly label: string;
  /** Where a single seated guest is being moved from. */
  readonly from: SeatRef | null;
}

/** "The Mehtas" becomes "the Mehtas" mid-sentence; names stay as they are. */
export function midSentence(label: string): string {
  return label.startsWith('The ') ? `the ${label.slice(4)}` : label;
}

export function partyPayload(group: UnseatedGroup): Payload {
  const ids = group.members.map((m) => m.id);
  const label = ids.length > 1 && group.partyId !== null ? midSentence(group.label) : (group.members[0]?.name ?? '');
  return { guestIds: ids, label, from: null };
}

export function guestPayload(guest: Guest): Payload {
  return { guestIds: [guest.id], label: guest.name, from: guest.seat };
}

/** "Holding the Mehtas, 4 guests. Choose a seat. Escape to cancel." */
export function holdingMessage(p: Payload): string {
  const n = p.guestIds.length;
  return n > 1
    ? $localize`:@@hold.many:Holding ${p.label}:who:, ${n}:n: guests. Choose a seat. Escape to cancel.`
    : $localize`:@@hold.one:Holding ${p.label}:who:. Choose a seat. Escape to cancel.`;
}

export type DropPreview =
  { readonly ok: true; readonly seats: readonly SeatRef[] } | { readonly ok: false; readonly free: number | null };

/** Where a payload would land on `target`, from a dry run of the real domain op. */
export function dropPreview(event: SeatingEvent, payload: Payload, target: SeatRef): DropPreview {
  const result = seatGuests(event, payload.guestIds, target);
  if (!result.ok) return { ok: false, free: result.reason === 'no-room' ? result.free : null };
  const moved = new Set(payload.guestIds);
  const seats = result.event.guests.filter((g) => moved.has(g.id) && g.seat).map((g) => g.seat as SeatRef);
  return { ok: true, seats };
}

/** Seats the payload now occupies after a drop, for the pop and glow. */
export function landedSeats(event: SeatingEvent, ids: readonly GuestId[]): SeatRef[] {
  const set = new Set(ids);
  return event.guests.filter((g) => set.has(g.id) && g.seat).map((g) => g.seat as SeatRef);
}

export interface MealCount {
  readonly meal: Meal;
  readonly label: string;
  readonly count: number;
  readonly tone: Tone | null;
}

/** Meals at a table, most common first, for the kitchen. */
export function mealCounts(guests: readonly Guest[]): MealCount[] {
  const counts = new Map<Meal, number>();
  for (const g of guests) counts.set(g.meal, (counts.get(g.meal) ?? 0) + 1);
  return [...counts.entries()]
    .map(([meal, n]) => ({ meal, label: MEAL_LABEL[meal], count: n, tone: MEAL_TONE[meal] }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Seats per shape when added from the toolbar. */
export const NEW_TABLE: Record<TableShape, number> = { round: 10, long: 12, head: 8 };

/**
 * A free spot for a new table: the first position on a 20-unit grid, scanning
 * rows from the top, whose footprint (plus a margin) overlaps no table or zone.
 * Falls back to the plan centre when the room is full.
 */
export function findFreeSpot(
  event: SeatingEvent,
  shape: TableShape,
  seats: number,
  margin = 16,
): { x: number; y: number } {
  const { width, height, zones } = event.plan;
  const probe = (x: number, y: number) => tableBounds({ id: '', label: '', shape, seats, x, y, rotation: 0 });
  const blocks = [
    ...event.tables.map((t) => tableBounds(t)),
    ...zones.map((z) => ({ x: z.x, y: z.y, w: z.w, h: z.h })),
  ];
  const step = 20;
  for (let y = step; y < height; y += step) {
    for (let x = step; x < width; x += step) {
      const b = probe(x, y);
      if (b.x < margin || b.y < margin || b.x + b.w > width - margin || b.y + b.h > height - margin) continue;
      const clear = blocks.every(
        (o) =>
          b.x + b.w + margin <= o.x ||
          o.x + o.w + margin <= b.x ||
          b.y + b.h + margin <= o.y ||
          o.y + o.h + margin <= b.y,
      );
      if (clear) return { x, y };
    }
  }
  return { x: Math.round(width / 2), y: Math.round(height / 2) };
}

/** Round to the 10-unit snap used for table moves. */
export function snap(n: number, to = 10): number {
  return Math.round(n / to) * to || 0;
}

export interface SummaryLine {
  readonly text: string;
  readonly needsYou: boolean;
  /** Unseated guests the line is about, so "Needs you" can jump to them. */
  readonly guestIds: readonly GuestId[];
}

export interface AutoSummary {
  readonly placed: number;
  readonly title: string;
  readonly placedLines: readonly SummaryLine[];
  readonly needsYou: readonly SummaryLine[];
}

/** Turn the solver's notes into the rail summary, resolving "Needs you" names back to guests. */
export function autoSummary(event: SeatingEvent, placed: number, notes: readonly Explanation[]): AutoSummary {
  const lines = notes.map((note): SummaryLine => {
    const { text, needsYou } = explain(note);
    if (note.code !== 'needs-you') return { text, needsYou, guestIds: [] };
    const party = note.partyLabel ? event.parties.find((p) => p.label === note.partyLabel) : undefined;
    const pool = event.guests.filter((g) => g.seat === null);
    const guestIds = party
      ? pool.filter((g) => g.partyId === party.id).map((g) => g.id)
      : pool.filter((g) => note.names.includes(g.name)).map((g) => g.id);
    return { text, needsYou, guestIds };
  });
  const title =
    placed === 0
      ? $localize`:@@auto.none:Nobody new to seat`
      : $localize`:@@auto.title:Auto-seated ${count(placed)}:n: ${plural(placed, 'guest', 'guests')}:guests:`;
  return {
    placed,
    title,
    placedLines: lines.filter((l) => !l.needsYou),
    needsYou: lines.filter((l) => l.needsYou),
  };
}
