/**
 * Every sentence the app builds from domain data. The domain returns codes and
 * names; this file turns them into words with $localize, so a translation only
 * touches the app.
 */
import type {
  EventKind,
  Explanation,
  ImportErrorCode,
  Meal,
  NeedsYouReason,
  OpFailure,
  RuleDescription,
  RuleStatus,
  Rsvp,
} from '@seated/domain';

const listFormat = new Intl.ListFormat('en-IN', { style: 'long', type: 'conjunction' });
const numberFormat = new Intl.NumberFormat('en-IN');

/** "Dev, Rohan and Kamla". */
export function names(list: readonly string[]): string {
  return listFormat.format(list);
}

/** Indian digit grouping: 1,00,000. */
export function count(n: number): string {
  return numberFormat.format(n);
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export const RSVP_LABEL: Record<Rsvp, string> = {
  accepted: $localize`:@@rsvp.accepted:Coming`,
  pending: $localize`:@@rsvp.pending:Awaiting`,
  declined: $localize`:@@rsvp.declined:Declined`,
};

export const MEAL_LABEL: Record<Meal, string> = {
  veg: $localize`:@@meal.veg:Veg`,
  'non-veg': $localize`:@@meal.nonVeg:Non-veg`,
  jain: $localize`:@@meal.jain:Jain`,
  vegan: $localize`:@@meal.vegan:Vegan`,
  other: $localize`:@@meal.other:Other`,
};

export const KIND_LABEL: Record<EventKind, string> = {
  wedding: $localize`:@@kind.wedding:Wedding`,
  birthday: $localize`:@@kind.birthday:Birthday`,
  office: $localize`:@@kind.office:Office dinner`,
  conference: $localize`:@@kind.conference:Conference lunch`,
  other: $localize`:@@kind.other:Event`,
};

export const STATUS_LABEL: Record<RuleStatus, string> = {
  met: $localize`:@@rule.status.met:Met`,
  waiting: $localize`:@@rule.status.waiting:Waiting`,
  conflict: $localize`:@@rule.status.conflict:Conflict`,
};

/** The rule as a standing instruction, e.g. "Keep Dev and Rohan apart". */
export function ruleTitle(d: RuleDescription): string {
  switch (d.kind) {
    case 'apart':
      return $localize`:@@rule.apart:Keep ${names(d.names)}:names: apart`;
    case 'together':
      return $localize`:@@rule.together:Keep ${d.partyLabel ?? names(d.names)}:party: together`;
    case 'near-exit':
      return $localize`:@@rule.nearExit:Seat ${names(d.names)}:name: near the exit`;
    case 'capacity':
      return $localize`:@@rule.capacity:${d.tableLabel}:table: seats ${d.seats}:seats:`;
  }
}

/** What is true right now for that rule. */
export function ruleDetail(d: RuleDescription, status: RuleStatus): string {
  if (status === 'waiting') return $localize`:@@rule.detail.waiting:Waiting for everyone to have a seat`;
  switch (d.kind) {
    case 'apart':
      return status === 'conflict'
        ? $localize`:@@rule.detail.apartConflict:Both are at ${d.tableLabel ?? ''}:table:`
        : $localize`:@@rule.detail.apartMet:At different tables`;
    case 'together':
      return status === 'conflict'
        ? $localize`:@@rule.detail.togetherConflict:Split across tables`
        : $localize`:@@rule.detail.togetherMet:Together at ${d.tableLabel ?? ''}:table:`;
    case 'near-exit':
      return status === 'conflict'
        ? $localize`:@@rule.detail.exitConflict:${d.tableLabel ?? ''}:table: is not near an exit`
        : $localize`:@@rule.detail.exitMet:At ${d.tableLabel ?? ''}:table:, by the exit`;
    case 'capacity':
      return $localize`:@@rule.detail.capacity:${d.assigned ?? 0}:assigned: of ${d.seats ?? 0}:seats: seats taken`;
  }
}

/** Why an edit was refused, for a toast. */
export function failure(f: OpFailure): string {
  switch (f.reason) {
    case 'no-room':
      return f.free === 0
        ? $localize`:@@fail.noRoomNone:That table is full`
        : $localize`:@@fail.noRoom:Only ${f.free}:free: ${plural(f.free, 'seat', 'seats')}:seats: free there. Try a bigger table.`;
    case 'occupied':
      return $localize`:@@fail.occupied:That seat is taken. Move one guest at a time to swap.`;
    case 'duplicate':
      return $localize`:@@fail.duplicate:That rule already exists`;
    case 'invalid':
      return $localize`:@@fail.invalid:That change is not valid (${f.field}:field:)`;
    case 'not-found':
      return $localize`:@@fail.notFound:Someone in that change no longer exists`;
  }
}

const NEEDS_YOU: Record<NeedsYouReason, string> = {
  'no-room-for-party': $localize`:@@why.noRoomForParty:no table has room for the whole party`,
  'no-room': $localize`:@@why.noRoom:every seat is taken`,
  'no-seat-near-exit': $localize`:@@why.noSeatNearExit:no free seat near the exit`,
  'party-table-full': $localize`:@@why.partyTableFull:their party's table is full`,
  'apart-in-party': $localize`:@@why.apartInParty:a keep-apart rule splits their own party`,
  'apart-blocks-all': $localize`:@@why.apartBlocksAll:every table with room has someone they must avoid`,
};

/** One line of the auto-seat summary. */
export function explain(e: Explanation): { text: string; needsYou: boolean } {
  switch (e.code) {
    case 'placed-party':
      return {
        text: $localize`:@@explain.party:Seated ${e.partyLabel}:party: (${e.count}:count:) together at ${e.tableLabel}:table:`,
        needsYou: false,
      };
    case 'placed-guest':
      return { text: $localize`:@@explain.guest:Seated ${e.name}:name: at ${e.tableLabel}:table:`, needsYou: false };
    case 'placed-near-exit':
      return {
        text: $localize`:@@explain.exit:Seated ${e.name}:name: at ${e.tableLabel}:table:, near the exit`,
        needsYou: false,
      };
    case 'kept-apart':
      return { text: $localize`:@@explain.apart:Kept ${names(e.names)}:names: at different tables`, needsYou: false };
    case 'made-room':
      return {
        text: $localize`:@@explain.madeRoom:Moved ${names(e.names)}:names: to make room for ${e.forLabel}:for: at ${e.tableLabel}:table:`,
        needsYou: false,
      };
    case 'needs-you':
      return {
        text: $localize`:@@explain.needsYou:Needs you: ${e.partyLabel ?? names(e.names)}:who:, because ${NEEDS_YOU[e.reason]}:why:`,
        needsYou: true,
      };
  }
}

export const IMPORT_ERROR: Record<ImportErrorCode, string> = {
  'missing-name': $localize`:@@import.missingName:Name is missing`,
  'bad-email': $localize`:@@import.badEmail:Email does not look right`,
  'unknown-rsvp': $localize`:@@import.unknownRsvp:RSVP not recognised, left as awaiting`,
  'unknown-meal': $localize`:@@import.unknownMeal:Meal not recognised, left blank`,
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}
