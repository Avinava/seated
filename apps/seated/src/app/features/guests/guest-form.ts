import {
  FormArray,
  FormControl,
  FormGroup,
  Validators,
  type AbstractControl,
  type AsyncValidatorFn,
  type ValidationErrors,
  type ValidatorFn,
} from '@angular/forms';
import {
  addGuest,
  nextIdFor,
  ok,
  removeGuests,
  updateGuest,
  type Guest,
  type GuestId,
  type GuestPatch,
  type Meal,
  type OpResult,
  type PartyId,
  type Rsvp,
  type SeatingEvent,
} from '@seated/domain';
import { map, of, timer, type Observable } from 'rxjs';

export interface PlusOneForm {
  /** The plus-one's guest id, or null for one added in this form. */
  readonly id: FormControl<GuestId | null>;
  readonly name: FormControl<string>;
}

export interface GuestForm {
  readonly name: FormControl<string>;
  readonly email: FormControl<string>;
  readonly groupId: FormControl<string>;
  /** Party label: an existing party's label picks it, a new label creates one, blank means none. */
  readonly party: FormControl<string>;
  readonly rsvp: FormControl<Rsvp>;
  readonly meal: FormControl<Meal>;
  readonly dietary: FormControl<string>;
  readonly tags: FormControl<string[]>;
  readonly access: FormControl<boolean>;
  readonly plusOnes: FormArray<FormGroup<PlusOneForm>>;
  readonly notes: FormControl<string>;
}

export type GuestFormGroup = FormGroup<GuestForm>;
export type GuestFormValue = ReturnType<GuestFormGroup['getRawValue']>;
export type PlusOneValue = GuestFormValue['plusOnes'][number];

/** How long the duplicate-email check waits after the last keystroke. */
export const EMAIL_CHECK_DELAY = 300;

const notBlank = Validators.pattern(/\S/);

/** Cross-field: "Other" says nothing on its own, so it needs the dietary note filled in. */
export const dietaryRequired: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const meal = group.get('meal')?.value as Meal | undefined;
  const dietary = String(group.get('dietary')?.value ?? '');
  return meal === 'other' && dietary.trim() === '' ? { dietaryRequired: true } : null;
};

/**
 * Async: flags an email another guest in the event already uses. Waits
 * `delay` ms first; the forms API drops the pending check when the value
 * changes again, so only the last keystroke is checked.
 */
export function uniqueEmail(
  guests: () => readonly Guest[],
  self: () => GuestId | null,
  delay = EMAIL_CHECK_DELAY,
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const email = String(control.value ?? '')
      .trim()
      .toLowerCase();
    if (email === '') return of(null);
    return timer(delay).pipe(
      map(() => {
        const me = self();
        const other = guests().find((g) => g.id !== me && g.email.trim().toLowerCase() === email);
        return other ? { duplicateEmail: { name: other.name } } : null;
      }),
    );
  };
}

export function plusOneGroup(value: { id: GuestId | null; name: string } = { id: null, name: '' }) {
  return new FormGroup<PlusOneForm>({
    id: new FormControl<GuestId | null>(value.id),
    name: new FormControl(value.name, { nonNullable: true, validators: [Validators.required, notBlank] }),
  });
}

export function guestForm(guests: () => readonly Guest[], self: () => GuestId | null): GuestFormGroup {
  return new FormGroup<GuestForm>(
    {
      name: new FormControl('', { nonNullable: true, validators: [Validators.required, notBlank] }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.email],
        asyncValidators: [uniqueEmail(guests, self)],
      }),
      groupId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      party: new FormControl('', { nonNullable: true }),
      rsvp: new FormControl<Rsvp>('pending', { nonNullable: true }),
      meal: new FormControl<Meal>('veg', { nonNullable: true }),
      dietary: new FormControl('', { nonNullable: true }),
      tags: new FormControl<string[]>([], { nonNullable: true }),
      access: new FormControl(false, { nonNullable: true }),
      plusOnes: new FormArray<FormGroup<PlusOneForm>>([]),
      notes: new FormControl('', { nonNullable: true }),
    },
    { validators: [dietaryRequired] },
  );
}

/** The form's starting value for a guest, or for a new one. */
export function formValueFor(event: SeatingEvent, guestId: GuestId | null): GuestFormValue {
  const g = guestId === null ? undefined : event.guests.find((x) => x.id === guestId);
  const party = g?.partyId ? (event.parties.find((p) => p.id === g.partyId)?.label ?? '') : '';
  return {
    name: g?.name ?? '',
    email: g?.email ?? '',
    groupId: g?.groupId ?? event.groups[0]?.id ?? '',
    party,
    rsvp: g?.rsvp ?? 'pending',
    meal: g?.meal ?? 'veg',
    dietary: g?.dietary ?? '',
    tags: [...(g?.tags ?? [])],
    access: g?.access ?? false,
    plusOnes: g ? event.guests.filter((x) => x.plusOneOf === g.id).map((x) => ({ id: x.id, name: x.name })) : [],
    notes: g?.notes ?? '',
  };
}

/** Reset to a value, rebuilding the plus-one rows to match. */
export function resetGuestForm(form: GuestFormGroup, value: GuestFormValue): void {
  form.controls.plusOnes.clear({ emitEvent: false });
  for (const p of value.plusOnes) form.controls.plusOnes.push(plusOneGroup(p), { emitEvent: false });
  form.reset(value);
}

/**
 * Find the party a label names, or add it. The guest's current party wins a
 * tie, so editing someone never moves them to a look-alike party.
 */
export function resolveParty(
  event: SeatingEvent,
  label: string,
  current: PartyId | null,
): { event: SeatingEvent; partyId: PartyId | null } {
  const clean = label.trim();
  if (clean === '') return { event, partyId: null };
  const same = (l: string) => l.trim().toLowerCase() === clean.toLowerCase();
  const mine = event.parties.find((p) => p.id === current && same(p.label));
  const found = mine ?? event.parties.find((p) => same(p.label));
  if (found) return { event, partyId: found.id };
  const partyId = nextIdFor('party', event.parties);
  return { event: { ...event, parties: [...event.parties, { id: partyId, label: clean }] }, partyId };
}

/** Parties nobody belongs to any more go, with any together rule about them. */
function pruneParties(event: SeatingEvent): SeatingEvent {
  const used = new Set(event.guests.map((g) => g.partyId));
  if (event.parties.every((p) => used.has(p.id))) return event;
  const parties = event.parties.filter((p) => used.has(p.id));
  const live = new Set(parties.map((p) => p.id));
  const rules = event.rules.filter((r) => r.kind !== 'together' || live.has(r.partyId));
  return { ...event, parties, rules };
}

/**
 * Everything the guest panel's Save does, as one pure op so one Undo reverts
 * it all: resolve or create the party, add or update the guest (which also
 * keeps their near-exit rule in step with step-free access), then add, rename
 * or remove their plus-ones, who share the guest's party and group.
 */
export function saveGuest(
  event: SeatingEvent,
  guestId: GuestId | null,
  value: GuestFormValue,
): OpResult<{ readonly id: GuestId }> {
  const current = guestId === null ? null : (event.guests.find((g) => g.id === guestId) ?? null);
  if (guestId !== null && !current) return { ok: false, reason: 'not-found', ids: [guestId] };
  const party = resolveParty(event, value.party, current?.partyId ?? null);
  let e = party.event;
  const patch: GuestPatch = {
    name: value.name,
    email: value.email,
    groupId: value.groupId,
    partyId: party.partyId,
    rsvp: value.rsvp,
    meal: value.meal,
    dietary: value.dietary.trim(),
    tags: value.tags,
    access: value.access,
    notes: value.notes.trim(),
  };

  let id: GuestId;
  if (guestId === null) {
    const added = addGuest(e, { ...patch, name: value.name });
    if (!added.ok) return added;
    e = added.event;
    id = added.id;
  } else {
    const updated = updateGuest(e, guestId, patch);
    if (!updated.ok) return updated;
    e = updated.event;
    id = guestId;
  }

  const kept = new Set(value.plusOnes.map((p) => p.id).filter((x) => x !== null));
  const dropped = e.guests.filter((g) => g.plusOneOf === id && !kept.has(g.id)).map((g) => g.id);
  if (dropped.length > 0) {
    const removed = removeGuests(e, dropped);
    if (!removed.ok) return removed;
    e = removed.event;
  }
  for (const p of value.plusOnes) {
    const shared = { name: p.name, partyId: party.partyId, groupId: value.groupId };
    const step =
      p.id === null
        ? addGuest(e, { ...shared, plusOneOf: id, rsvp: value.rsvp })
        : updateGuest(e, p.id, { ...shared, plusOneOf: id });
    if (!step.ok) return step;
    e = step.event;
  }
  return ok(pruneParties(e), { id });
}
