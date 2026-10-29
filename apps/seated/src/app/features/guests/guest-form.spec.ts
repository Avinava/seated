import { FormControl, FormGroup } from '@angular/forms';
import type { SeatingEvent } from '@seated/domain';
import { firstValueFrom, isObservable, type Observable } from 'rxjs';
import {
  dietaryRequired,
  formValueFor,
  guestForm,
  plusOneGroup,
  resetGuestForm,
  resolveParty,
  saveGuest,
  uniqueEmail,
  type GuestFormValue,
} from './guest-form';
import { wedding } from './testing';

const event = wedding();
const kamla = event.guests.find((g) => g.name === 'Kamla Mehta')!;
const guestOf = (e: SeatingEvent, id: string) => e.guests.find((g) => g.id === id)!;

describe('guest form', () => {
  describe('dietaryRequired (cross-field)', () => {
    it.each([
      ['veg', '', null],
      ['other', '', { dietaryRequired: true }],
      ['other', '   ', { dietaryRequired: true }],
      ['other', 'Keto', null],
      ['jain', 'No onion', null],
    ])('meal %s with dietary "%s" gives %j', (meal, dietary, errors) => {
      const group = new FormGroup({ meal: new FormControl(meal), dietary: new FormControl(dietary) });
      expect(dietaryRequired(group)).toEqual(errors);
    });
  });

  describe('uniqueEmail (async)', () => {
    const check = async (email: string, self: string | null) => {
      const result = uniqueEmail(
        () => event.guests,
        () => self,
        0,
      )(new FormControl(email));
      return isObservable(result) ? firstValueFrom(result as Observable<unknown>) : result;
    };

    it.each([
      ['', null, null],
      ['someone.new@example.com', null, null],
      [kamla.email, kamla.id, null],
      [kamla.email, null, { duplicateEmail: { name: 'Kamla Mehta' } }],
      [`  ${kamla.email.toUpperCase()} `, 'g-001', { duplicateEmail: { name: 'Kamla Mehta' } }],
    ])('"%s" for %s gives %j', async (email, self, errors) => {
      expect(await check(email, self)).toEqual(errors);
    });

    it('waits before checking and goes pending meanwhile', async () => {
      vi.useFakeTimers();
      try {
        const control = new FormControl(kamla.email, {
          nonNullable: true,
          asyncValidators: [
            uniqueEmail(
              () => event.guests,
              () => null,
              300,
            ),
          ],
        });
        expect(control.pending).toBe(true);
        await vi.advanceTimersByTimeAsync(299);
        expect(control.pending).toBe(true);
        await vi.advanceTimersByTimeAsync(1);
        expect(control.errors).toEqual({ duplicateEmail: { name: 'Kamla Mehta' } });
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('the form', () => {
    const form = () =>
      guestForm(
        () => event.guests,
        () => kamla.id,
      );

    it('loads a guest, with their party label and plus-ones', () => {
      const f = form();
      const host = event.guests.find((g) => event.guests.some((x) => x.plusOneOf === g.id))!;
      resetGuestForm(f, formValueFor(event, host.id));
      expect(f.controls.plusOnes.length).toBe(event.guests.filter((x) => x.plusOneOf === host.id).length);
      resetGuestForm(f, formValueFor(event, kamla.id));
      expect(f.getRawValue()).toMatchObject({ name: 'Kamla Mehta', party: 'The Mehtas', access: true, plusOnes: [] });
      expect(f.pristine).toBe(true);
    });

    it.each([
      [{ name: '' }, 'name', 'required'],
      [{ name: '  ' }, 'name', 'pattern'],
      [{ email: 'not-an-email' }, 'email', 'email'],
    ] as const)('%j fails %s with %s', (patch, control, error) => {
      const f = form();
      resetGuestForm(f, formValueFor(event, kamla.id));
      f.patchValue(patch);
      expect(f.controls[control].hasError(error)).toBe(true);
    });

    it('needs a name on every plus-one', () => {
      const f = form();
      resetGuestForm(f, formValueFor(event, kamla.id));
      f.controls.plusOnes.push(plusOneGroup());
      expect(f.controls.plusOnes.valid).toBe(false);
      f.controls.plusOnes.at(0).controls.name.setValue('Ravi Mehta');
      expect(f.controls.plusOnes.valid).toBe(true);
    });

    it('starts a new guest as awaiting in the first group', () => {
      expect(formValueFor(event, null)).toMatchObject({ name: '', rsvp: 'pending', groupId: 'grp-1', plusOnes: [] });
    });
  });

  describe('resolveParty', () => {
    it.each([
      ['', null, false],
      ['The Mehtas', kamla.partyId, false],
      ['  the mehtas ', kamla.partyId, false],
      ['The Kapoors of Pune', 'p-046', true],
    ])('"%s" resolves to %s (new: %s)', (label, id, created) => {
      const r = resolveParty(event, label, null);
      expect(r.partyId).toBe(id);
      expect(r.event.parties.length).toBe(event.parties.length + (created ? 1 : 0));
    });
  });

  describe('saveGuest', () => {
    const base = (): GuestFormValue => formValueFor(event, kamla.id);

    it('updates the guest and keeps the near-exit rule in step with access', () => {
      const result = saveGuest(event, kamla.id, { ...base(), name: 'Kamla Devi Mehta', access: false });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(guestOf(result.event, kamla.id).name).toBe('Kamla Devi Mehta');
      expect(result.event.rules.some((r) => r.kind === 'near-exit' && r.guestId === kamla.id)).toBe(false);
      expect(guestOf(result.event, kamla.id).seat).toEqual(kamla.seat);
    });

    it('adds a new guest, creating their party', () => {
      const value = { ...formValueFor(event, null), name: 'Zoya Khan', party: 'The Khans', tags: ['VIP'] };
      const result = saveGuest(event, null, value);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const zoya = guestOf(result.event, result.id);
      const party = result.event.parties.find((p) => p.id === zoya.partyId);
      expect(party?.label).toBe('The Khans');
      expect(zoya.tags).toEqual(['vip']);
    });

    it('adds, renames and removes plus-ones in the same save', () => {
      const added = saveGuest(event, kamla.id, {
        ...base(),
        plusOnes: [
          { id: null, name: 'Ravi Mehta' },
          { id: null, name: 'Asha Mehta' },
        ],
      });
      expect(added.ok).toBe(true);
      if (!added.ok) return;
      const plusOnes = added.event.guests.filter((g) => g.plusOneOf === kamla.id);
      expect(plusOnes.map((g) => g.name)).toEqual(['Ravi Mehta', 'Asha Mehta']);
      expect(plusOnes.every((g) => g.partyId === kamla.partyId && g.groupId === kamla.groupId)).toBe(true);

      const [ravi] = plusOnes;
      const edited = saveGuest(added.event, kamla.id, {
        ...formValueFor(added.event, kamla.id),
        plusOnes: [{ id: ravi!.id, name: 'Ravi K Mehta' }],
      });
      expect(edited.ok).toBe(true);
      if (!edited.ok) return;
      expect(edited.event.guests.filter((g) => g.plusOneOf === kamla.id).map((g) => g.name)).toEqual(['Ravi K Mehta']);
      expect(edited.event.guests).toHaveLength(event.guests.length + 1);
    });

    it('drops a party nobody belongs to any more', () => {
      const solo = saveGuest(event, null, { ...formValueFor(event, null), name: 'Solo', party: 'Party of one' });
      if (!solo.ok) throw new Error('setup');
      const moved = saveGuest(solo.event, solo.id, { ...formValueFor(solo.event, solo.id), party: '' });
      expect(moved.ok).toBe(true);
      if (!moved.ok) return;
      expect(moved.event.parties.some((p) => p.label === 'Party of one')).toBe(false);
    });

    it.each([
      ['a blank name', { name: ' ' }, 'name'],
      ['Other without a note', { meal: 'other' as const, dietary: '' }, 'dietary'],
    ])('refuses %s', (_, patch, field) => {
      const result = saveGuest(event, kamla.id, { ...base(), ...patch });
      expect(result).toMatchObject({ ok: false, reason: 'invalid', field });
    });

    it('refuses a guest that no longer exists', () => {
      expect(saveGuest(event, 'g-missing', base())).toMatchObject({ ok: false, reason: 'not-found' });
    });
  });
});
