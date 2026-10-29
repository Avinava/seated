import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MEALS, RSVPS, describeRule, removeGuests, type GuestId, type Rsvp } from '@seated/domain';
import {
  StButton,
  StChip,
  StDialog,
  StDrawer,
  StField,
  StIcon,
  StIconButton,
  StInput,
  StSegmented,
  StSwitch,
  type SegmentedOption,
} from '@seated/kit';
import { filter, firstValueFrom, map } from 'rxjs';
import { MEAL_LABEL, RSVP_LABEL, ruleDetail, ruleTitle } from '../../i18n/messages';
import { Actions } from '../../state/actions';
import { command } from '../../state/command';
import { EventStore } from '../../state/event-store';
import { formValueFor, guestForm, plusOneGroup, resetGuestForm, saveGuest } from './guest-form';
import { LABELS, NEW_GUEST, tagsInUse } from './guests.vm';

/**
 * The guest side panel: one typed form for everything about a guest, their
 * seat and any rule they are breaking. Save is a single undoable command.
 */
@Component({
  selector: 'st-guest-panel',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    StButton,
    StChip,
    StDialog,
    StDrawer,
    StField,
    StIcon,
    StIconButton,
    StInput,
    StSegmented,
    StSwitch,
  ],
  templateUrl: './guest-panel.html',
  styleUrl: './guest-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestPanel {
  private readonly store = inject(EventStore);
  private readonly actions = inject(Actions);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** A guest id, `new`, or nothing (closed). Bound from the `guest` query param. */
  readonly guestKey = input<string | null>(null);
  /** The panel wants to close: the owner drops the query param. */
  readonly closed = output();

  protected readonly isNew = computed(() => this.guestKey() === NEW_GUEST);
  protected readonly guestId = computed<GuestId | null>(() => {
    const key = this.guestKey();
    return key && key !== NEW_GUEST ? key : null;
  });
  protected readonly guest = computed(() => {
    const id = this.guestId();
    return id ? this.store.guestsById().get(id) : undefined;
  });
  /**
   * Open for `new` or a guest that exists. Once open it stays open until the
   * key changes, so deleting the guest lets the panel close in its own time
   * instead of vanishing under the confirm dialog.
   */
  protected readonly open = linkedSignal<{ key: string | null; exists: boolean }, boolean>({
    source: () => ({ key: this.guestKey(), exists: this.isNew() || this.guest() !== undefined }),
    computation: ({ key, exists }, previous) =>
      key !== null && (exists || (previous?.source.key === key && previous.value)),
  });

  protected readonly form = guestForm(
    () => this.store.guests(),
    () => this.guestId(),
  );
  /** Reactive forms are not signals; this ticks on every value, status and touch change. */
  private readonly version = toSignal(this.form.events.pipe(map((_, i) => i)), { initialValue: -1 });
  protected readonly submitted = signal(false);
  protected readonly confirmDiscard = signal(false);
  protected readonly confirmDelete = signal(false);
  protected readonly tagDraft = signal('');

  protected readonly rsvpOptions: SegmentedOption<Rsvp>[] = RSVPS.map((r) => ({ value: r, label: RSVP_LABEL[r] }));
  protected readonly meals = MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }));
  protected readonly groups = this.store.groups;
  protected readonly parties = computed(() => this.store.doc()?.parties ?? []);
  protected readonly knownTags = computed(() => {
    const doc = this.store.doc();
    return doc ? tagsInUse(doc) : [];
  });

  protected readonly heading = computed(() =>
    this.isNew() ? $localize`:@@guest.newHeading:New guest` : (this.guest()?.name ?? ''),
  );
  protected readonly description = computed(() => {
    const g = this.guest();
    if (!g) return $localize`:@@guest.newDescription:They start as awaiting a reply, with no seat.`;
    const group = this.store.groupsById().get(g.groupId)?.label;
    const party = g.partyId ? this.store.partiesById().get(g.partyId)?.label : undefined;
    return [group, party].filter(Boolean).join(' · ');
  });

  protected readonly seat = computed(() => {
    const g = this.guest();
    if (!g?.seat) return null;
    const table = this.store.tablesById().get(g.seat.tableId);
    return table ? $localize`:@@guest.seat:${table.label}:table:, seat ${g.seat.index + 1}:seat:` : null;
  });
  protected readonly seatingLink = computed(() => `/events/${this.store.doc()?.id ?? ''}/seating`);

  protected readonly conflicts = computed(() => {
    const id = this.guestId();
    const doc = this.store.doc();
    const report = this.store.report();
    if (!id || !doc || !report) return [];
    return (report.conflictsByGuest.get(id) ?? []).flatMap((ruleId) => {
      const check = report.byRule.get(ruleId);
      if (!check) return [];
      const d = describeRule(check.rule, doc);
      return [{ id: ruleId, title: ruleTitle(d), detail: ruleDetail(d, check.status) }];
    });
  });

  // Form state as signals ------------------------------------------------------

  private readonly value = computed(() => {
    this.version();
    return this.form.getRawValue();
  });
  protected readonly rsvp = computed(() => this.value().rsvp);
  protected readonly access = computed(() => this.value().access);
  protected readonly tags = computed(() => this.value().tags);
  protected readonly mealIsOther = computed(() => this.value().meal === 'other');
  protected readonly plusOneRows = computed(() => {
    this.version();
    return this.form.controls.plusOnes.controls;
  });

  private shown(touched: boolean): boolean {
    return touched || this.submitted();
  }

  protected readonly nameError = computed(() => {
    this.version();
    const c = this.form.controls.name;
    return this.shown(c.touched) && c.invalid ? $localize`:@@guest.nameRequired:Enter the guest's name` : null;
  });

  protected readonly emailPending = computed(() => {
    this.version();
    return this.form.controls.email.pending;
  });

  protected readonly emailError = computed(() => {
    this.version();
    const c = this.form.controls.email;
    if (c.hasError('duplicateEmail')) {
      const name = (c.getError('duplicateEmail') as { name: string }).name;
      return $localize`:@@guest.emailDuplicate:${name}:name: already uses this email`;
    }
    if (this.shown(c.touched) && c.hasError('email')) {
      return $localize`:@@guest.emailInvalid:That does not look like an email address`;
    }
    return null;
  });

  protected readonly dietaryError = computed(() => {
    this.version();
    const show = this.shown(this.form.controls.dietary.touched || this.form.controls.meal.touched);
    return show && this.form.hasError('dietaryRequired')
      ? $localize`:@@guest.dietaryRequired:Say what "Other" means for the kitchen`
      : null;
  });

  protected plusOneError(index: number): string | null {
    const c = this.form.controls.plusOnes.at(index)?.controls.name;
    return c && this.shown(c.touched) && c.invalid
      ? $localize`:@@guest.plusOneRequired:Enter a name or remove this plus-one`
      : null;
  }

  protected readonly checkingHint = $localize`:@@guest.emailChecking:Checking the other guests`;
  protected readonly addLabel = $localize`:@@guest.add:Add guest`;
  protected readonly saveLabel = $localize`:@@guest.save:Save`;
  protected readonly deleteHeading = computed(
    () => $localize`:@@guest.deleteHeading:Delete ${this.guest()?.name ?? ''}:name:?`,
  );

  protected readonly plusOneLabel = (i: number) => $localize`:@@guest.plusOneN:Plus-one ${i + 1}:n:`;
  protected readonly removePlusOneLabel = (i: number) => $localize`:@@guest.removePlusOne:Remove plus-one ${i + 1}:n:`;

  constructor() {
    // A different guest (or a fresh "new") starts from that guest's saved values.
    effect(() => {
      const key = this.guestKey();
      if (!key) return;
      untracked(() => {
        const doc = this.store.doc();
        if (!doc) return;
        resetGuestForm(this.form, formValueFor(doc, this.guestId()));
        this.submitted.set(false);
        this.tagDraft.set('');
        this.confirmDiscard.set(false);
        this.confirmDelete.set(false);
      });
    });
    // The form directive revalidates the whole tree quietly when it first binds,
    // which restarts the email check without events. Run it once more, out loud,
    // so its result reaches the view.
    afterNextRender(() => this.form.controls.email.updateValueAndValidity());
  }

  // Controls the forms API cannot bind to directly -------------------------------

  protected setRsvp(value: Rsvp | null): void {
    if (value === null) return;
    this.form.controls.rsvp.setValue(value);
    this.form.controls.rsvp.markAsDirty();
  }

  protected setAccess(value: boolean): void {
    this.form.controls.access.setValue(value);
    this.form.controls.access.markAsDirty();
  }

  protected addTag(): void {
    const tag = this.tagDraft().trim().toLowerCase().replace(/,$/, '');
    this.tagDraft.set('');
    if (tag === '' || this.tags().includes(tag)) return;
    this.form.controls.tags.setValue([...this.tags(), tag]);
    this.form.controls.tags.markAsDirty();
  }

  protected removeTag(tag: string): void {
    this.form.controls.tags.setValue(this.tags().filter((t) => t !== tag));
    this.form.controls.tags.markAsDirty();
  }

  protected onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
    } else if (event.key === 'Backspace' && this.tagDraft() === '' && this.tags().length > 0) {
      this.removeTag(this.tags().at(-1) ?? '');
    }
  }

  protected addPlusOne(): void {
    this.form.controls.plusOnes.push(plusOneGroup());
    this.form.controls.plusOnes.markAsDirty();
    const index = this.form.controls.plusOnes.length - 1;
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(`[data-plus-one="${index}"]`)?.focus(), {
      injector: this.injector,
    });
  }

  protected removePlusOne(index: number): void {
    this.form.controls.plusOnes.removeAt(index);
    this.form.controls.plusOnes.markAsDirty();
  }

  // Closing ---------------------------------------------------------------------

  /** Passed to the drawer: a dirty form asks before it goes. */
  protected readonly canClose = (): boolean => {
    if (!this.form.dirty) return true;
    this.confirmDiscard.set(true);
    return false;
  };

  protected requestClose(): void {
    if (this.canClose()) this.closed.emit();
  }

  protected discard(): void {
    this.confirmDiscard.set(false);
    this.form.markAsPristine();
    this.closeAfterConfirm();
  }

  /**
   * Close once the confirm dialog has gone. The dialog hands focus back into
   * the panel as it closes; the panel then hands it back to whatever opened it.
   * In the other order focus would land on an element that is about to vanish.
   */
  private closeAfterConfirm(): void {
    afterNextRender(() => this.closed.emit(), { injector: this.injector });
  }

  // Saving ----------------------------------------------------------------------

  async save(): Promise<boolean> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.pending) {
      // Restart the email check so its result is sure to emit, then wait for it.
      const settled = firstValueFrom(this.form.statusChanges.pipe(filter((s) => s !== 'PENDING')));
      this.form.controls.email.updateValueAndValidity();
      await settled;
    }
    if (this.form.invalid) {
      afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus(), {
        injector: this.injector,
      });
      return false;
    }
    const id = this.guestId();
    const value = this.form.getRawValue();
    const name = value.name.trim();
    const label =
      id === null ? $localize`:@@guest.cmd.add:add ${name}:name:` : $localize`:@@guest.cmd.edit:edit ${name}:name:`;
    const result = this.actions.run(
      command(label, (e) => saveGuest(e, id, value)),
      id === null ? $localize`:@@guest.added:Added ${name}:name:` : $localize`:@@guest.saved:Saved ${name}:name:`,
    );
    if (!result.ok) return false;
    this.form.markAsPristine();
    this.closed.emit();
    return true;
  }

  protected deleteGuest(): void {
    const g = this.guest();
    this.confirmDelete.set(false);
    if (!g) return;
    const result = this.actions.run(
      command(LABELS.remove(g.name), (e) => removeGuests(e, [g.id])),
      $localize`:@@guest.removed:Removed ${g.name}:name:`,
    );
    if (!result.ok) return;
    this.form.markAsPristine();
    this.closeAfterConfirm();
  }
}
