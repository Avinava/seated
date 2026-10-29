/**
 * The Seated domain model. Plain data, no classes, no Angular. Every value here
 * round-trips through JSON, which keeps storage, export and undo simple.
 */

export type EventId = string;
export type GuestId = string;
export type PartyId = string;
export type GroupId = string;
export type TableId = string;
export type RuleId = string;

export type Rsvp = 'accepted' | 'pending' | 'declined';
export const RSVPS: readonly Rsvp[] = ['accepted', 'pending', 'declined'];

export type Meal = 'veg' | 'non-veg' | 'jain' | 'vegan' | 'other';
export const MEALS: readonly Meal[] = ['veg', 'non-veg', 'jain', 'vegan', 'other'];

export type EventKind = 'wedding' | 'birthday' | 'office' | 'conference' | 'other';

/** One of four category tones in the design tokens (cat-1 .. cat-4). */
export type Tone = 1 | 2 | 3 | 4;

/** A colour-coded way of splitting guests: bride's family, a team, a side. */
export interface Group {
  readonly id: GroupId;
  readonly label: string;
  readonly tone: Tone;
}

/** A household or booking that should move and sit together. */
export interface Party {
  readonly id: PartyId;
  readonly label: string;
}

export interface SeatRef {
  readonly tableId: TableId;
  /** Zero-based seat index, less than the table's seat count. */
  readonly index: number;
}

export interface Guest {
  readonly id: GuestId;
  readonly name: string;
  readonly email: string;
  readonly partyId: PartyId | null;
  readonly groupId: GroupId;
  readonly rsvp: Rsvp;
  readonly meal: Meal;
  /** Free text, required when meal is 'other'. */
  readonly dietary: string;
  readonly tags: readonly string[];
  /** Needs step-free access; adds an implicit near-exit expectation. */
  readonly access: boolean;
  /** Set when this guest is someone else's plus-one. */
  readonly plusOneOf: GuestId | null;
  readonly notes: string;
  readonly seat: SeatRef | null;
}

export type TableShape = 'round' | 'long' | 'head';

export interface Table {
  readonly id: TableId;
  /** Short label shown on the plan, e.g. "T3" or "Head". */
  readonly label: string;
  readonly shape: TableShape;
  readonly seats: number;
  /** Centre of the table in floor-plan units. */
  readonly x: number;
  readonly y: number;
  /** Long tables can be turned; round and head tables ignore this. */
  readonly rotation: 0 | 90;
}

export type ZoneKind = 'stage' | 'bar' | 'exit' | 'entrance' | 'dance-floor';

export interface Zone {
  readonly kind: ZoneKind;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface FloorPlan {
  readonly width: number;
  readonly height: number;
  readonly zones: readonly Zone[];
}

export type Rule =
  | { readonly id: RuleId; readonly kind: 'apart'; readonly guests: readonly [GuestId, GuestId] }
  | { readonly id: RuleId; readonly kind: 'together'; readonly partyId: PartyId }
  | { readonly id: RuleId; readonly kind: 'near-exit'; readonly guestId: GuestId };

export type RuleKind = Rule['kind'] | 'capacity';

export interface SeatingEvent {
  readonly id: EventId;
  readonly name: string;
  readonly kind: EventKind;
  /** ISO date, e.g. "2026-12-18". */
  readonly date: string;
  readonly venue: string;
  readonly city: string;
  readonly groups: readonly Group[];
  readonly parties: readonly Party[];
  readonly guests: readonly Guest[];
  readonly tables: readonly Table[];
  readonly rules: readonly Rule[];
  readonly plan: FloorPlan;
  readonly createdAt: string;
  readonly updatedAt: string;
}
