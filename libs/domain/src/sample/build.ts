import type { Group, Guest, GuestId, Meal, Party, Rsvp, SeatRef, TableId } from '../model/types';
import { DIETARY_NOTES, emailFor, MEAL_WEIGHTS, OTHER_DIETS, NameBook, type Gender } from './names';
import type { Rng } from './random';

/** One person in a hand-planned party; omitted names are drawn from the name book. */
export interface PersonSpec {
  readonly gender: Gender;
  readonly first?: string;
  readonly surname?: string;
  readonly groupId?: string;
  readonly access?: boolean;
  readonly tags?: readonly string[];
}

export interface PartySpec {
  /** family: "The Xs", shared surname; pair: two people, "A & B"; single: no party. */
  readonly kind: 'family' | 'pair' | 'single';
  readonly groupId: string;
  readonly rsvp: Rsvp;
  readonly table: TableId | null;
  readonly people: readonly PersonSpec[];
  readonly surname?: string;
  readonly label?: string;
  /** In a pair, the second person is the first one's plus-one. */
  readonly plusOne?: boolean;
  readonly tags?: readonly string[];
}

export interface Built {
  readonly guests: Guest[];
  readonly parties: Party[];
  /** Guest ids per spec, in spec order. */
  readonly members: GuestId[][];
}

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

/** Turn party specs into guests and parties with stable ids and seeded details. */
export function buildGuests(
  rng: Rng,
  specs: readonly PartySpec[],
  surnames: readonly string[],
  groups: readonly Group[],
): Built {
  const book = new NameBook(rng);
  const familyNames = rng.shuffle(surnames);
  let nextFamily = 0;
  const guests: Guest[] = [];
  const parties: Party[] = [];
  const members: GuestId[][] = [];
  const seats = new Map<TableId, number>();
  const fallbackGroup = groups[0]?.id ?? 'grp-1';

  for (const spec of specs) {
    const familySurname =
      spec.kind === 'family' ? (spec.surname ?? familyNames[nextFamily++ % familyNames.length] ?? 'Rao') : null;
    const people = spec.people.map((p) => {
      const surname = p.surname ?? familySurname ?? rng.pick(surnames);
      if (p.first) return { ...p, fixed: true, first: p.first, full: book.reserve(`${p.first} ${surname}`) };
      return { ...p, fixed: false, ...book.person(p.gender, surname) };
    });
    let partyId: string | null = null;
    if (spec.kind !== 'single') {
      partyId = `p-${pad(parties.length + 1)}`;
      const label = spec.label ?? (familySurname ? `The ${familySurname}s` : people.map((p) => p.first).join(' & '));
      parties.push({ id: partyId, label });
    }
    const sharedTags = [...(spec.tags ?? []), ...(rng.chance(0.18) ? ['out-of-town'] : [])];
    const ids: GuestId[] = [];
    people.forEach((p, i) => {
      const id = `g-${pad(guests.length + 1)}`;
      const child = p.gender === 'child';
      let meal: Meal = rng.weighted(MEAL_WEIGHTS);
      let dietary = '';
      if (meal === 'other') dietary = rng.pick(OTHER_DIETS);
      else if (rng.chance(0.08)) dietary = rng.pick(DIETARY_NOTES);
      if (child && meal === 'other') meal = 'veg';
      if (child) dietary = '';
      const plusOneOf = spec.plusOne && i === 1 ? (ids[0] ?? null) : null;
      let seat: SeatRef | null = null;
      if (spec.table !== null && spec.rsvp === 'accepted') {
        const index = seats.get(spec.table) ?? 0;
        seats.set(spec.table, index + 1);
        seat = { tableId: spec.table, index };
      }
      guests.push({
        id,
        name: p.full,
        email: child || plusOneOf !== null || (!p.fixed && rng.chance(0.08)) ? '' : emailFor(p.full),
        partyId,
        groupId: p.groupId ?? spec.groupId ?? fallbackGroup,
        rsvp: spec.rsvp,
        meal,
        dietary,
        tags: [...new Set([...sharedTags, ...(p.tags ?? []), ...(child ? ['kids'] : [])])],
        access: p.access ?? false,
        plusOneOf,
        notes: '',
        seat,
      });
      ids.push(id);
    });
    members.push(ids);
  }
  return { guests, parties, members };
}

const F: PersonSpec = { gender: 'f' };
const M: PersonSpec = { gender: 'm' };
const C: PersonSpec = { gender: 'child' };

/** People for a family of `size`: a couple, then children or grown children. */
export function familyPeople(rng: Rng, size: number): PersonSpec[] {
  const adults: PersonSpec[] = size === 1 ? [rng.pick([F, M])] : [M, F];
  const rest = Array.from({ length: Math.max(0, size - 2) }, () => (rng.chance(0.6) ? C : rng.pick([F, M])));
  return [...adults, ...rest];
}

export function pairPeople(rng: Rng): PersonSpec[] {
  return rng.shuffle([F, M]);
}

export { F, M, C };
