import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { EventKind } from '@seated/domain';
import { Announcer, StButton, StDialog, StField, StInput, ToastService } from '@seated/kit';
import { map } from 'rxjs';
import { CLOCK } from '../../core/clock';
import { EventsStore } from '../../state/events-store';
import { TEMPLATES, isoToday } from './events.vm';
import { newEventForm } from './new-event.form';

/** Where to go once the event exists: add guests by hand, or import a list. */
export type NewEventNext = 'guests' | 'import';

/** "New event": name, kind and date, then straight into the new event's guest list. */
@Component({
  selector: 'st-new-event-dialog',
  imports: [ReactiveFormsModule, StDialog, StField, StInput, StButton],
  template: `
    <st-dialog
      [(open)]="open"
      heading="New event"
      i18n-heading="@@events.new.heading"
      description="Pick a template for its tables and groups. You can change everything later."
      i18n-description="@@events.new.description"
    >
      <form id="new-event-form" class="form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <st-field label="Name" i18n-label="@@events.new.name" [error]="nameError()" required>
          <input stInput formControlName="name" autocomplete="off" placeholder="Riya and Arjun's wedding" />
        </st-field>
        <div class="pair">
          <st-field label="Kind" i18n-label="@@events.new.kind">
            <select stInput formControlName="kind">
              @for (t of templates; track t.kind) {
                <option [value]="t.kind">{{ t.label }}</option>
              }
            </select>
          </st-field>
          <st-field label="Date" i18n-label="@@events.new.date" [error]="dateError()" required>
            <input stInput type="date" formControlName="date" [min]="today()" />
          </st-field>
        </div>
      </form>
      <ng-container stDialogFooter>
        <button stButton type="button" (click)="open.set(false)" i18n="@@action.cancel">Cancel</button>
        <button stButton variant="primary" type="submit" form="new-event-form" [disabled]="busy()">
          {{ next() === 'import' ? importLabel : createLabel }}
        </button>
      </ng-container>
    </st-dialog>
  `,
  styles: `
    .form {
      display: grid;
      gap: var(--st-space-4);
    }

    .pair {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: var(--st-space-3);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewEventDialog {
  private readonly events = inject(EventsStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly announcer = inject(Announcer);
  private readonly clock = inject(CLOCK);

  readonly open = model(false);
  /** The template picked on the home screen. */
  readonly kind = input<EventKind>('wedding');
  readonly next = input<NewEventNext>('guests');

  protected readonly templates = TEMPLATES;
  protected readonly today = computed(() => isoToday(this.clock()));
  protected readonly form = newEventForm('wedding', () => isoToday(this.clock()));
  protected readonly busy = signal(false);
  private readonly submitted = signal(false);
  protected readonly createLabel = $localize`:@@events.new.create:Create event`;
  protected readonly importLabel = $localize`:@@events.new.createImport:Create and import`;

  /** Reactive forms are not signals; this ticks on every value, status and touch change. */
  private readonly version = toSignal(this.form.events.pipe(map((_, i) => i)), { initialValue: -1 });

  protected readonly nameError = computed(() => {
    this.version();
    const c = this.form.controls.name;
    if (!this.show(c.touched) || c.valid) return null;
    return $localize`:@@events.new.nameRequired:Give the event a name`;
  });

  protected readonly dateError = computed(() => {
    this.version();
    const c = this.form.controls.date;
    if (!this.show(c.touched) || c.valid) return null;
    return c.hasError('past')
      ? $localize`:@@events.new.datePast:Pick today or a later date`
      : $localize`:@@events.new.dateRequired:Pick a date`;
  });

  constructor() {
    // Each opening starts a fresh form with the template that was clicked.
    effect(() => {
      if (!this.open()) return;
      const kind = this.kind();
      untracked(() => {
        this.form.reset({ name: '', kind, date: '' });
        this.submitted.set(false);
      });
    });
  }

  private show(touched: boolean): boolean {
    return touched || this.submitted();
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    const { name, kind, date } = this.form.getRawValue();
    try {
      const event = await this.events.create(kind, name, date);
      this.open.set(false);
      const message = $localize`:@@events.new.created:Created ${event.name}:name:`;
      this.toast.show({ message });
      this.announcer.announce(message);
      await this.router.navigate(['/events', event.id, this.next()]);
    } finally {
      this.busy.set(false);
    }
  }
}
