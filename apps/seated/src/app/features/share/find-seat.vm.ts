import { normalizeName, type ShareErrorCode, type SharePayload, type TableShape } from '@seated/domain';
import type { SeatView } from '@seated/kit';
import { initials } from '../../i18n/messages';

type SharedGuest = SharePayload['guests'][number];

export interface GuestMatch {
  /** Stable key for @for tracking: table and seat are unique together. */
  readonly key: string;
  readonly name: string;
  readonly table: string;
  /** One-based, as people count seats. */
  readonly seat: number;
}

export const MAX_MATCHES = 5;
/** Shorter queries match half the list, which helps nobody. */
export const MIN_QUERY = 2;

function toMatch(g: SharedGuest): GuestMatch {
  return { key: `${g.table}#${g.seat}`, name: g.name, table: g.table, seat: g.seat + 1 };
}

/**
 * Guests whose name matches what was typed, best first. Accents, case and
 * punctuation are ignored ("kamla", "KAMLĀ" and "Kamla M" all find Kamla
 * Mehta). Best is a name that starts with the query, then one where every
 * typed word starts a word of the name, then the query anywhere inside it,
 * then the same ignoring spaces ("dsouza" finds Joel D'Souza).
 */
export function matchGuests(payload: SharePayload, query: string, limit = MAX_MATCHES): GuestMatch[] {
  const q = normalizeName(query);
  if (q.length < MIN_QUERY) return [];
  const tokens = q.split(' ');
  const scored: { g: SharedGuest; score: number }[] = [];
  for (const g of payload.guests) {
    const name = normalizeName(g.name);
    const words = name.split(' ');
    let score: number | null = null;
    if (name.startsWith(q)) score = 0;
    else if (tokens.every((t) => words.some((w) => w.startsWith(t)))) score = 1;
    else if (name.includes(q)) score = 2;
    else if (name.replace(/ /g, '').includes(q.replace(/ /g, ''))) score = 3;
    if (score !== null) scored.push({ g, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.g.name.localeCompare(b.g.name))
    .slice(0, limit)
    .map(({ g }) => toMatch(g));
}

export interface Tablemate {
  readonly name: string;
  readonly seat: number;
}

export interface SeatResult {
  readonly name: string;
  readonly firstName: string;
  readonly table: string;
  readonly shape: TableShape;
  readonly seat: number;
  readonly seats: readonly SeatView[];
  /** Others at the table in seat order; empty when the hosts hid tablemates. */
  readonly mates: readonly Tablemate[];
  readonly showMates: boolean;
}

/** Marks a taken seat when tablemates are hidden: it counts as seated but names nobody. */
export const HIDDEN_MATE = '•';

/**
 * Everything the "You're at T5" card shows. The table is drawn at its real
 * size (older links without sizes fall back to the highest seat taken). Your
 * seat is picked (accent ring, filled border); others are filled, with
 * initials only when tablemates are shown, so the drawing never leaks a hidden name.
 */
export function seatResult(payload: SharePayload, match: GuestMatch): SeatResult {
  const showMates = payload.tablemates !== false;
  const table = payload.tables.find((t) => t.label === match.table);
  const atTable = payload.guests.filter((g) => g.table === match.table);
  const count = Math.max(table?.seats ?? 0, match.seat, ...atTable.map((g) => g.seat + 1));
  const bySeat = new Map(atTable.map((g) => [g.seat, g]));
  const seats: SeatView[] = Array.from({ length: count }, (_, i) => {
    const g = bySeat.get(i);
    const n = i + 1;
    if (!g)
      return { initials: '', tone: null, state: 'empty', label: $localize`:@@find.seatEmpty:Seat ${n}:n:, empty` };
    if (i === match.seat - 1) {
      return {
        initials: initials(g.name),
        tone: 1,
        state: 'picked',
        label: $localize`:@@find.seatYou:Seat ${n}:n:, you`,
      };
    }
    return showMates
      ? {
          initials: initials(g.name),
          tone: null,
          state: 'filled',
          label: $localize`:@@find.seatMate:Seat ${n}:n:, ${g.name}:name:`,
        }
      : { initials: HIDDEN_MATE, tone: null, state: 'filled', label: $localize`:@@find.seatTaken:Seat ${n}:n:, taken` };
  });
  const mates = showMates
    ? atTable
        .filter((g) => g.seat !== match.seat - 1)
        .sort((a, b) => a.seat - b.seat)
        .map((g) => ({ name: g.name, seat: g.seat + 1 }))
    : [];
  return {
    name: match.name,
    firstName: match.name.split(/\s+/)[0] ?? match.name,
    table: match.table,
    shape: table?.shape ?? 'round',
    seat: match.seat,
    seats,
    mates,
    showMates,
  };
}

export type LinkProblem = ShareErrorCode | 'missing';

export interface FriendlyError {
  readonly heading: string;
  readonly body: string;
}

/** What a guest reads when the link is missing or damaged. Never a code or a stack. */
export function linkProblem(problem: LinkProblem): FriendlyError {
  switch (problem) {
    case 'missing':
      return {
        heading: $localize`:@@find.missing.heading:Open the link from your hosts`,
        body: $localize`:@@find.missing.body:This page shows your seat once you open the full link the hosts sent you. The event details travel in the link itself, after the # sign.`,
      };
    case 'unsupported-version':
      return {
        heading: $localize`:@@find.newer.heading:This link is from a newer Seated`,
        body: $localize`:@@find.newer.body:Ask the hosts to send the link again, or try updating this page.`,
      };
    case 'bad-encoding':
      return {
        heading: $localize`:@@find.cut.heading:This link looks cut short`,
        body: $localize`:@@find.cut.body:Part of it may have gone missing when it was copied. Open it straight from the message, or ask the hosts for a fresh one.`,
      };
    case 'corrupt':
    case 'invalid-payload':
      return {
        heading: $localize`:@@find.damaged.heading:We can't read this link`,
        body: $localize`:@@find.damaged.body:It seems to have been changed along the way. Ask the hosts for a fresh link.`,
      };
  }
}

/** For the live region: "3 matches", "1 match", or the no-match hint. */
export function matchCountText(count: number): string {
  if (count === 0)
    return $localize`:@@find.noMatch:We can't find that name. Try your first name only, or ask the hosts.`;
  return count === 1 ? $localize`:@@find.oneMatch:1 match` : $localize`:@@find.matches:${count}:count: matches`;
}
