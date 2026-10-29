import type { EventKind, FormatError, SeatingEvent } from '@seated/domain';
import { daysUntil, localDate } from '../../core/dates';
import { KIND_LABEL, count, plural } from '../../i18n/messages';

/** What one card on the home screen shows. */
export interface EventCardVm {
  readonly id: string;
  readonly name: string;
  readonly kind: EventKind;
  readonly kindLabel: string;
  /** "Fri 18 Dec 2026". */
  readonly when: string;
  /** "Juniper Hall · Bengaluru", or '' for a new event without a venue. */
  readonly place: string;
  /** "in 50 days", "Today", "3 days ago". */
  readonly countdown: string;
  readonly past: boolean;
  readonly invited: number;
  /** Guests who answered either way. */
  readonly replied: number;
  /** Guests who said yes. */
  readonly coming: number;
  /** Guests with a seat. */
  readonly seated: number;
  /** "108/120". */
  readonly repliedText: string;
  /** "84 of 100". */
  readonly seatedText: string;
  readonly link: string;
}

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const todayFormat = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

/** "Fri 18 Dec 2026": built from parts, since engines disagree on where en-IN puts commas. */
export function formatEventDate(isoDate: string): string {
  const parts = Object.fromEntries(dateFormat.formatToParts(localDate(isoDate)).map((p) => [p.type, p.value]));
  return `${parts['weekday']} ${parts['day']} ${parts['month']} ${parts['year']}`;
}

/** "Thursday, 29 October", the kicker above the home heading. */
export function formatToday(now: Date): string {
  return todayFormat.format(now);
}

export function countdown(days: number): string {
  if (days === 0) return $localize`:@@events.today:Today`;
  if (days === 1) return $localize`:@@events.tomorrow:Tomorrow`;
  if (days === -1) return $localize`:@@events.yesterday:Yesterday`;
  return days > 0
    ? $localize`:@@events.inDays:in ${count(days)}:days: days`
    : $localize`:@@events.daysAgo:${count(-days)}:days: days ago`;
}

/**
 * The ring shows replies (accepted or declined) out of everyone invited: it
 * answers "how many people still owe me an answer", which is what an organiser
 * chases before seating. The bar then shows seats against guests who are coming.
 */
export function eventCard(event: SeatingEvent, now: Date): EventCardVm {
  const guests = event.guests;
  const coming = guests.filter((g) => g.rsvp === 'accepted').length;
  const declined = guests.filter((g) => g.rsvp === 'declined').length;
  const seated = guests.filter((g) => g.seat !== null).length;
  const days = daysUntil(event.date, now);
  return {
    id: event.id,
    name: event.name,
    kind: event.kind,
    kindLabel: KIND_LABEL[event.kind],
    when: formatEventDate(event.date),
    place: [event.venue, event.city].filter((p) => p.trim() !== '').join(' · '),
    countdown: countdown(days),
    past: days < 0,
    invited: guests.length,
    replied: coming + declined,
    coming,
    seated,
    repliedText: `${count(coming + declined)}/${count(guests.length)}`,
    seatedText: $localize`:@@events.seatedOf:${count(seated)}:seated: of ${count(coming)}:coming:`,
    link: `/events/${event.id}/seating`,
  };
}

export interface TemplateOption {
  readonly kind: EventKind;
  readonly label: string;
}

/** The starting points offered on the home screen and in the new-event form. */
export const TEMPLATES: readonly TemplateOption[] = (['wedding', 'birthday', 'office', 'conference'] as const).map(
  (kind) => ({ kind, label: KIND_LABEL[kind] }),
);

/** Why an export file was refused, in one sentence for a toast. */
export function importFileError(errors: readonly FormatError[]): string {
  const [first] = errors;
  switch (first?.code) {
    case 'invalid-json':
      return $localize`:@@events.import.json:That file is not readable JSON. Choose a Seated export (.json).`;
    case 'wrong-format':
      return $localize`:@@events.import.format:That is not a Seated export file.`;
    case 'unsupported-version':
      return $localize`:@@events.import.version:That export comes from a newer version of Seated.`;
    default:
      return $localize`:@@events.import.invalid:That export file is damaged (${errors.length}:count: ${plural(errors.length, 'problem', 'problems')}:problems:, first at ${first?.path ?? ''}:path:).`;
  }
}

/** Today's date in local time as an ISO date, for date inputs. */
export function isoToday(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
