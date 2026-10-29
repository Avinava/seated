import { CdkDrag, CdkDragPreview, CdkDropList, type CdkDragMove, type CdkDragEnd } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Guest } from '@seated/domain';
import { StAvatar, StButton, StIcon, StInput } from '@seated/kit';
import { MEAL_LABEL, count, initials } from '../../i18n/messages';
import { EventStore } from '../../state/event-store';
import { SeatingCommands } from './seating-commands';
import { SeatingDrag } from './seating-drag';
import { SeatingStore } from './seating.store';
import { guestPayload, partyPayload, toneFor, unseatedGroups, type Payload, type UnseatedGroup } from './seating.vm';

/**
 * The left rail: who still needs a seat, grouped by household. Every row is a
 * button: Enter, Space or a click picks it up (a party header picks up the
 * whole household), and it can be dragged onto a seat. Seated guests dragged
 * back here are unseated.
 */
@Component({
  selector: 'st-unseated-list',
  imports: [CdkDropList, CdkDrag, CdkDragPreview, RouterLink, StAvatar, StButton, StIcon, StInput],
  templateUrl: './unseated-list.html',
  styleUrl: './unseated-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnseatedList {
  protected readonly events = inject(EventStore);
  protected readonly view = inject(SeatingStore);
  private readonly commands = inject(SeatingCommands);
  private readonly drag = inject(SeatingDrag);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Inside a drawer, whose heading already names the list. */
  readonly inDrawer = input(false, { transform: booleanAttribute });
  /** A row was picked up (used by the page to close a drawer so the plan is visible). */
  readonly picked = output();

  protected readonly groups = computed(() => {
    const doc = this.events.doc();
    return doc ? unseatedGroups(doc, this.view.filter(), this.view.colorBy()) : [];
  });
  protected readonly coming = computed(() => this.groups().filter((g) => !g.pending));
  protected readonly awaiting = computed(() => this.groups().filter((g) => g.pending));

  /** Coming guests without a seat, ignoring the filter. */
  protected readonly remaining = computed(
    () => this.events.guests().filter((g) => g.seat === null && g.rsvp === 'accepted').length,
  );
  protected readonly footer = computed(() => {
    const guests = this.events.guests();
    const pending = count(guests.filter((g) => g.rsvp === 'pending').length);
    const declined = count(guests.filter((g) => g.rsvp === 'declined').length);
    return $localize`:@@unseated.footer:${pending}:pending: awaiting reply · ${declined}:declined: declined`;
  });
  protected readonly printLink = computed(() => `/events/${this.events.doc()?.id ?? ''}/print`);
  /** A seated guest is being dragged over the list: dropping here unseats them. */
  protected readonly dropping = computed(() => {
    const d = this.view.dragging();
    return !!d?.from && this.view.target()?.kind === 'unseated';
  });

  constructor() {
    // Bring a guest named by the auto-seat summary or the palette into view and focus.
    afterRenderEffect(() => {
      const id = this.view.focusGuestId();
      if (!id) return;
      const row = this.host.querySelector<HTMLElement>(`[data-guest-id="${id}"]`);
      row?.focus();
      row?.scrollIntoView({ block: 'nearest' });
    });
  }

  protected initials = initials;

  protected tone(g: Guest) {
    return toneFor(g, this.view.colorBy(), this.events.groupsById()) ?? 'neutral';
  }

  protected meal(g: Guest): string {
    return MEAL_LABEL[g.meal];
  }

  protected isHeld(ids: readonly string[]): boolean {
    const held = this.view.held()?.guestIds;
    return !!held && held.length === ids.length && ids.every((id) => held.includes(id));
  }

  protected partyPayload = partyPayload;
  protected guestPayload = guestPayload;

  /** Read after the visible party name, so the button's name still starts with what you see. */
  protected partySuffix(group: UnseatedGroup): string {
    return $localize`:@@unseated.party:, ${group.members.length}:n: guests. Pick up the whole party`;
  }

  protected toggle(payload: Payload): void {
    if (this.isHeld(payload.guestIds)) {
      this.commands.cancel();
      return;
    }
    this.view.focusGuest(null);
    this.commands.pickUp(payload);
    this.picked.emit();
  }

  protected started(payload: Payload): void {
    this.drag.listDragStarted(payload);
  }

  protected moved(e: CdkDragMove): void {
    this.drag.listDragMoved(e.pointerPosition);
  }

  protected ended(e: CdkDragEnd): void {
    this.drag.listDragEnded(e.dropPoint);
  }
}
