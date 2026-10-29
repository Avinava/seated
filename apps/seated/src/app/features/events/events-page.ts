import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { EventKind } from '@seated/domain';
import {
  Announcer,
  StBar,
  StButton,
  StCard,
  StIcon,
  StPill,
  StProgressRing,
  StSkeleton,
  ToastService,
} from '@seated/kit';
import { CLOCK } from '../../core/clock';
import { EventsStore } from '../../state/events-store';
import { TEMPLATES, eventCard, formatToday, importFileError } from './events.vm';
import { NewEventDialog, type NewEventNext } from './new-event-dialog';

type View = 'loading' | 'empty' | 'list';

/** Home: every event on this device as a card, or the first-run welcome. */
@Component({
  selector: 'st-events-page',
  imports: [RouterLink, StBar, StButton, StCard, StIcon, StPill, StProgressRing, StSkeleton, NewEventDialog],
  templateUrl: './events-page.html',
  styleUrl: './events-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EventsPage {
  private readonly events = inject(EventsStore);
  private readonly clock = inject(CLOCK);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly announcer = inject(Announcer);

  protected readonly templates = TEMPLATES;
  protected readonly today = formatToday(this.clock());
  protected readonly skeletons = [0, 1, 2];
  /** Seven empty chairs around a table in the first-run drawing (the eighth, at the top, is taken). */
  protected readonly artSeats = [1, 2, 3, 4, 5, 6, 7].map((i) => {
    const a = (i * Math.PI) / 4;
    return { cx: Math.round(80 + 50 * Math.sin(a)), cy: Math.round(80 - 50 * Math.cos(a)) };
  });

  protected readonly cards = computed(() => {
    const now = this.clock();
    return this.events.sorted().map((e) => eventCard(e, now));
  });

  protected readonly view = computed<View>(() => {
    if (this.cards().length > 0) return 'list';
    return this.events.status() === 'ready' ? 'empty' : 'loading';
  });

  protected readonly dialogOpen = signal(false);
  protected readonly dialogKind = signal<EventKind>('wedding');
  protected readonly dialogNext = signal<NewEventNext>('guests');

  protected startNew(kind: EventKind, next: NewEventNext = 'guests'): void {
    this.dialogKind.set(kind);
    this.dialogNext.set(next);
    this.dialogOpen.set(true);
  }

  protected async importFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const result = await this.events.importFile(await file.text());
    if (!result.ok) {
      const message = importFileError(result.errors);
      this.toast.show({ message, tone: 'danger' });
      this.announcer.alert(message);
      return;
    }
    const message = $localize`:@@events.import.done:Opened ${result.event.name}:name:`;
    this.toast.show({ message });
    this.announcer.announce(message);
    await this.router.navigate(['/events', result.event.id, 'seating']);
  }
}
