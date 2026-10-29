import type { EventKind, Guest, Rsvp, SeatingEvent } from '../model/types';
import { buildGuests, familyPeople, pairPeople, type PartySpec } from './build';
import { SURNAMES } from './names';
import { createRng, type Rng } from './random';
import { layoutFor } from './templates';
import { createSampleWedding } from './wedding';

interface SmallSpec {
  readonly id: string;
  readonly name: string;
  readonly kind: EventKind;
  readonly date: string;
  readonly venue: string;
  readonly city: string;
  readonly seed: number;
  readonly guests: number;
  /** Party sizes to draw from, by weight. */
  readonly sizes: Readonly<Record<'1' | '2' | '3', number>>;
  readonly declined: number;
  readonly pending: number;
  /** Share of accepted guests to seat up front. */
  readonly seatShare: number;
}

function partySpecs(rng: Rng, spec: SmallSpec, groupIds: readonly string[]): PartySpec[] {
  const out: PartySpec[] = [];
  let left = spec.guests;
  while (left > 0) {
    const size = Math.min(left, Number(rng.weighted(spec.sizes)));
    const groupId = rng.pick(groupIds);
    const base = { groupId, rsvp: 'accepted' as Rsvp, table: null };
    if (size === 1)
      out.push({ ...base, kind: 'single', people: [rng.pick([{ gender: 'f' }, { gender: 'm' }] as const)] });
    else if (size === 2) out.push({ ...base, kind: 'pair', people: pairPeople(rng), plusOne: rng.chance(0.5) });
    else out.push({ ...base, kind: 'family', people: familyPeople(rng, size) });
    left -= size;
  }
  return out;
}

/** Mark whole parties declined or pending until each target is reached (or just passed). */
function assignRsvp(rng: Rng, parties: PartySpec[], spec: SmallSpec): PartySpec[] {
  const order = rng.shuffle(parties.map((_, i) => i));
  const out = [...parties];
  const targets: [Rsvp, number][] = [
    ['declined', spec.declined],
    ['pending', spec.pending],
  ];
  for (const [rsvp, target] of targets) {
    let count = 0;
    while (count < target && order.length > 0) {
      const i = order.shift() ?? 0;
      const p = out[i];
      if (!p) continue;
      out[i] = { ...p, rsvp };
      count += p.people.length;
    }
  }
  return out;
}

/** Seat whole accepted parties, grouped by side, first fit, until the share is reached. */
function preSeat(event: SeatingEvent, share: number): SeatingEvent {
  const accepted = event.guests.filter((g) => g.rsvp === 'accepted');
  const target = Math.round(accepted.length * share);
  const units = new Map<string, Guest[]>();
  for (const g of accepted) {
    const key = g.partyId ?? g.id;
    units.set(key, [...(units.get(key) ?? []), g]);
  }
  const groupOrder = new Map(event.groups.map((g, i) => [g.id, i]));
  const ordered = [...units.values()].sort(
    (a, b) => (groupOrder.get(a[0]?.groupId ?? '') ?? 0) - (groupOrder.get(b[0]?.groupId ?? '') ?? 0),
  );
  const used = new Map(event.tables.map((t) => [t.id, 0]));
  const seats = new Map<string, { tableId: string; index: number }>();
  let seated = 0;
  for (const unit of ordered) {
    if (seated >= target) break;
    const table = event.tables.find((t) => t.seats - (used.get(t.id) ?? 0) >= unit.length);
    if (!table) continue;
    for (const g of unit) {
      const index = used.get(table.id) ?? 0;
      used.set(table.id, index + 1);
      seats.set(g.id, { tableId: table.id, index });
    }
    seated += unit.length;
  }
  return { ...event, guests: event.guests.map((g) => ({ ...g, seat: seats.get(g.id) ?? null })) };
}

function createSmallEvent(spec: SmallSpec, now: Date): SeatingEvent {
  const rng = createRng(spec.seed);
  const layout = layoutFor(spec.kind);
  const parties = assignRsvp(
    rng,
    partySpecs(
      rng,
      spec,
      layout.groups.map((g) => g.id),
    ),
    spec,
  );
  const built = buildGuests(rng, parties, SURNAMES, layout.groups);
  const stamp = now.toISOString();
  return preSeat(
    {
      id: spec.id,
      name: spec.name,
      kind: spec.kind,
      date: spec.date,
      venue: spec.venue,
      city: spec.city,
      groups: layout.groups,
      parties: built.parties,
      guests: built.guests,
      tables: layout.tables,
      rules: [],
      plan: layout.plan,
      createdAt: stamp,
      updatedAt: stamp,
    },
    spec.seatShare,
  );
}

export function createSampleBirthday(now: Date): SeatingEvent {
  return createSmallEvent(
    {
      id: 'ev-birthday',
      name: "Meera's 30th",
      kind: 'birthday',
      date: '2026-11-21',
      venue: 'Toit',
      city: 'Bengaluru',
      seed: 30,
      guests: 24,
      sizes: { '1': 5, '2': 4, '3': 1 },
      declined: 2,
      pending: 3,
      seatShare: 0.7,
    },
    now,
  );
}

export function createSampleOffice(now: Date): SeatingEvent {
  return createSmallEvent(
    {
      id: 'ev-office',
      name: 'Kestrel annual dinner',
      kind: 'office',
      date: '2027-01-22',
      venue: 'The Courtyard',
      city: 'Pune',
      seed: 7,
      guests: 60,
      sizes: { '1': 7, '2': 3, '3': 0 },
      declined: 4,
      pending: 6,
      seatShare: 0.8,
    },
    now,
  );
}

/** Everything the home screen shows on first run: the wedding first. */
export function createSampleEvents(now: Date): SeatingEvent[] {
  return [createSampleWedding(now), createSampleBirthday(now), createSampleOffice(now)];
}
