import { FormControl, FormGroup, Validators, type ValidatorFn } from '@angular/forms';
import type { EventKind } from '@seated/domain';

export interface NewEventForm {
  readonly name: FormControl<string>;
  readonly kind: FormControl<EventKind>;
  /** ISO date from a date input, e.g. "2026-12-18". */
  readonly date: FormControl<string>;
}

/** Fails with `{ past: true }` for an ISO date before `today()`. Empty values are left to `required`. */
export function notInPast(today: () => string): ValidatorFn {
  return (control) => {
    const value = String(control.value ?? '');
    return value !== '' && value < today() ? { past: true } : null;
  };
}

export function newEventForm(kind: EventKind, today: () => string): FormGroup<NewEventForm> {
  return new FormGroup<NewEventForm>({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    kind: new FormControl<EventKind>(kind, { nonNullable: true }),
    date: new FormControl('', { nonNullable: true, validators: [Validators.required, notInPast(today)] }),
  });
}
