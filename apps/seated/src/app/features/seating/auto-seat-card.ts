import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { StButton, StIcon, StIconButton, StSwitch } from '@seated/kit';
import { count, plural } from '../../i18n/messages';
import { Actions } from '../../state/actions';
import { EventStore } from '../../state/event-store';
import { SeatingCommands } from './seating-commands';
import { SeatingStore } from './seating.store';
import type { SummaryLine } from './seating.vm';

/** The auto-seat action and, after a run, what it did and what still needs a person. */
@Component({
  selector: 'st-auto-seat-card',
  imports: [StButton, StIcon, StIconButton, StSwitch],
  template: `
    <section class="card" aria-labelledby="auto-title">
      <div class="row">
        <h2 id="auto-title" class="title" i18n="@@auto.heading">Auto-seat</h2>
        <span class="st-mono left">{{ leftLabel() }}</span>
      </div>
      <p class="lead">{{ lead() }}</p>
      <st-switch [checked]="view.includePending()" (checkedChange)="view.setIncludePending($event)">
        <span i18n="@@auto.includePending">Include awaiting replies</span>
      </st-switch>
      <button stButton variant="primary" class="run" [disabled]="toSeat() === 0" (click)="commands.autoSeat()">
        <st-icon name="sparkles" />
        <span i18n="@@auto.run">Auto-seat</span>
      </button>
    </section>

    @if (view.summary(); as s) {
      <section class="summary" role="status" aria-labelledby="summary-title" animate.enter="enter">
        <div class="row">
          <h3 id="summary-title" class="title">{{ s.title }}</h3>
          <button
            stIconButton
            icon="x"
            size="sm"
            aria-label="Dismiss the summary"
            i18n-aria-label="@@auto.dismiss"
            (click)="view.showSummary(null)"
          ></button>
        </div>
        @if (s.needsYou.length) {
          <ul class="needs" aria-label="Needs you" i18n-aria-label="@@auto.needsLabel">
            @for (line of s.needsYou; track $index) {
              <li>
                <button type="button" class="need" [disabled]="!line.guestIds.length" (click)="find(line)">
                  <st-icon name="alert" [size]="14" />
                  <span>{{ line.text }}</span>
                </button>
              </li>
            }
          </ul>
        }
        @if (s.placedLines.length) {
          <ul class="placed">
            @for (line of s.placedLines; track $index) {
              <li>{{ line.text }}</li>
            }
          </ul>
        }
        @if (s.placed > 0 && canUndo()) {
          <button stButton size="sm" (click)="undo()">
            <st-icon name="undo" [size]="14" />
            <span i18n="@@auto.undo">Undo auto-seat</span>
          </button>
        }
      </section>
    }
  `,
  styleUrl: './auto-seat-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoSeatCard {
  protected readonly events = inject(EventStore);
  protected readonly view = inject(SeatingStore);
  protected readonly commands = inject(SeatingCommands);
  private readonly actions = inject(Actions);

  private readonly waiting = computed(() => this.events.unseated());
  protected readonly toSeat = computed(
    () =>
      this.waiting().filter((g) => g.rsvp === 'accepted' || (this.view.includePending() && g.rsvp === 'pending'))
        .length,
  );
  protected readonly leftLabel = computed(
    () => `${count(this.events.seatedCount())}/${count(this.events.comingCount())}`,
  );
  protected readonly lead = computed(() => {
    const n = this.toSeat();
    if (n === 0) return $localize`:@@auto.leadDone:Everyone confirmed has a seat.`;
    const guests = `${count(n)} ${plural(n, 'guest', 'guests')}`;
    return $localize`:@@auto.lead:${guests}:guests: to place. Households stay together and every rule is kept; anyone it cannot place is listed for you.`;
  });
  protected readonly canUndo = computed(() => this.events.undoLabel()?.startsWith('auto-seat') ?? false);

  protected find(line: SummaryLine): void {
    const [first] = line.guestIds;
    if (first) this.view.focusGuest(first);
  }

  protected undo(): void {
    this.actions.undo();
    this.view.showSummary(null);
  }
}
