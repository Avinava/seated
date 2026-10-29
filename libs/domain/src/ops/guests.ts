import { MEALS, RSVPS, type Guest, type GuestId, type Rsvp, type SeatingEvent } from '../model/types';
import { nextIdFor } from './ids';
import { mapGuests, missingIds, uniqueIds } from './internal';
import { invalid, notFound, ok, type OpFailure, type OpResult } from './result';
import { syncAccessRule } from './rules';

/** Fields a caller may set on a guest. Seats change only through seating ops. */
export type GuestPatch = Partial<Omit<Guest, 'id' | 'seat'>>;

/** A new guest: a name is required, everything else has a default. */
export type GuestDraft = GuestPatch & { readonly name: string };

function checkPatch(event: SeatingEvent, patch: GuestPatch, self: GuestId | null): OpFailure | null {
  if (patch.name !== undefined && patch.name.trim() === '') return invalid('name');
  if (patch.groupId !== undefined && !event.groups.some((g) => g.id === patch.groupId)) {
    return notFound([patch.groupId]);
  }
  if (patch.partyId != null && !event.parties.some((p) => p.id === patch.partyId)) return notFound([patch.partyId]);
  if (patch.plusOneOf != null) {
    if (patch.plusOneOf === self) return invalid('plusOneOf');
    if (!event.guests.some((g) => g.id === patch.plusOneOf)) return notFound([patch.plusOneOf]);
  }
  if (patch.rsvp !== undefined && !RSVPS.includes(patch.rsvp)) return invalid('rsvp');
  if (patch.meal !== undefined && !MEALS.includes(patch.meal)) return invalid('meal');
  return null;
}

function normalize<T extends GuestPatch>(patch: T): T {
  const out: { -readonly [K in keyof T]: T[K] } = { ...patch };
  if (out.name !== undefined) out.name = out.name.trim();
  if (out.email !== undefined) out.email = out.email.trim();
  if (out.tags !== undefined) out.tags = normalizeTags(out.tags);
  return out;
}

export function normalizeTags(tags: readonly string[]): string[] {
  return uniqueIds(tags.map((t) => t.trim().toLowerCase()).filter((t) => t !== ''));
}

/** Declining frees the seat; nobody keeps a chair they will not use. */
function settle(g: Guest): Guest {
  return g.rsvp === 'declined' && g.seat !== null ? { ...g, seat: null } : g;
}

export function addGuest(event: SeatingEvent, draft: GuestDraft): OpResult<{ readonly id: GuestId }> {
  const groupId = draft.groupId ?? event.groups[0]?.id;
  if (groupId === undefined) return invalid('groupId');
  const patch = normalize({ ...draft, groupId });
  const failure = checkPatch(event, patch, null);
  if (failure) return failure;
  if (patch.meal === 'other' && !patch.dietary?.trim()) return invalid('dietary');
  const id = nextIdFor('guest', event.guests);
  const guest: Guest = settle({
    email: '',
    partyId: null,
    rsvp: 'pending',
    meal: 'veg',
    dietary: '',
    tags: [],
    access: false,
    plusOneOf: null,
    notes: '',
    ...patch,
    groupId,
    id,
    seat: null,
  });
  const next = syncAccessRule({ ...event, guests: [...event.guests, guest] }, id, guest.access);
  return ok(next, { id });
}

export function updateGuest(event: SeatingEvent, guestId: GuestId, patch: GuestPatch): OpResult {
  const current = event.guests.find((g) => g.id === guestId);
  if (!current) return notFound([guestId]);
  const clean = normalize(patch);
  const failure = checkPatch(event, clean, guestId);
  if (failure) return failure;
  const updated = settle({ ...current, ...clean, id: current.id, seat: current.seat });
  if (updated.meal === 'other' && updated.dietary.trim() === '') return invalid('dietary');
  const next = mapGuests(event, (g) => (g.id === guestId ? updated : g));
  return ok(clean.access === undefined ? next : syncAccessRule(next, guestId, clean.access));
}

/**
 * Remove guests along with every rule that names them and any plus-one link to
 * them. Parties left with no members go too, with their together rules.
 */
export function removeGuests(event: SeatingEvent, guestIds: readonly GuestId[]): OpResult {
  const ids = new Set(guestIds);
  const missing = missingIds([...ids], event.guests);
  if (missing.length > 0) return notFound(missing);
  const guests = event.guests
    .filter((g) => !ids.has(g.id))
    .map((g) => (g.plusOneOf !== null && ids.has(g.plusOneOf) ? { ...g, plusOneOf: null } : g));
  const liveParties = new Set(guests.map((g) => g.partyId));
  const parties = event.parties.filter((p) => liveParties.has(p.id));
  const partyIds = new Set(parties.map((p) => p.id));
  const rules = event.rules.filter((r) => {
    switch (r.kind) {
      case 'apart':
        return !ids.has(r.guests[0]) && !ids.has(r.guests[1]);
      case 'near-exit':
        return !ids.has(r.guestId);
      case 'together':
        return partyIds.has(r.partyId);
    }
  });
  return ok({ ...event, guests, parties, rules });
}

function bulk(event: SeatingEvent, guestIds: readonly GuestId[], fn: (g: Guest) => Guest): OpResult {
  const ids = new Set(guestIds);
  const missing = missingIds([...ids], event.guests);
  if (missing.length > 0) return notFound(missing);
  return ok(mapGuests(event, (g) => (ids.has(g.id) ? fn(g) : g)));
}

/** Set RSVP for many guests. Declining also unseats. */
export function setRsvp(event: SeatingEvent, guestIds: readonly GuestId[], rsvp: Rsvp): OpResult {
  if (!RSVPS.includes(rsvp)) return invalid('rsvp');
  return bulk(event, guestIds, (g) => (g.rsvp === rsvp ? g : settle({ ...g, rsvp })));
}

export function addTag(event: SeatingEvent, guestIds: readonly GuestId[], tag: string): OpResult {
  const [clean] = normalizeTags([tag]);
  if (clean === undefined) return invalid('tag');
  return bulk(event, guestIds, (g) => (g.tags.includes(clean) ? g : { ...g, tags: [...g.tags, clean] }));
}

export function removeTag(event: SeatingEvent, guestIds: readonly GuestId[], tag: string): OpResult {
  const clean = tag.trim().toLowerCase();
  return bulk(event, guestIds, (g) => (g.tags.includes(clean) ? { ...g, tags: g.tags.filter((t) => t !== clean) } : g));
}

/** Toggle step-free access and keep the guest's near-exit rule in step. */
export function setAccess(event: SeatingEvent, guestId: GuestId, access: boolean): OpResult {
  const current = event.guests.find((g) => g.id === guestId);
  if (!current) return notFound([guestId]);
  const next = mapGuests(event, (g) => (g.id === guestId && g.access !== access ? { ...g, access } : g));
  return ok(syncAccessRule(next, guestId, access));
}
