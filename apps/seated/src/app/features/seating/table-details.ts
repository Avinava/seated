import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, inject } from '@angular/core';
import { TABLE_SEATS, isNearExit, seatsAt } from '@seated/domain';
import { StButton, StIcon, StIconButton, StPill } from '@seated/kit';
import { MEAL_LABEL, count } from '../../i18n/messages';
import { EventStore } from '../../state/event-store';
import { SeatingCommands } from './seating-commands';
import { SeatingDrag } from './seating-drag';
import { SeatingStore } from './seating.store';
import { mealCounts, spokenTableName } from './seating.vm';

/** The selected table: who sits there, what the kitchen needs, and its size, turn and removal. */
@Component({
  selector: 'st-table-details',
  imports: [StButton, StIcon, StIconButton, StPill],
  template: `
    @if (details(); as d) {
      <section class="details" aria-labelledby="table-title">
        <div class="row">
          <h2 id="table-title" class="title">{{ d.name }}</h2>
          <span class="st-mono fill">{{ d.filled }}/{{ d.table.seats }}</span>
        </div>
        <div class="tags">
          @if (d.nearExit) {
            <st-pill tone="ok" i18n="@@details.nearExit">Near the exit</st-pill>
          }
          @for (m of d.meals; track m.meal) {
            <st-pill [tone]="m.tone ?? 'neutral'">{{ m.label }} {{ m.count }}</st-pill>
          }
        </div>
        <ol class="guests">
          @for (s of d.seats; track $index) {
            <li>
              <button type="button" class="seat-row" [class.is-empty]="!s" (click)="focusSeat($index)">
                <span class="n st-mono">{{ $index + 1 }}</span>
                <span class="name">{{ s?.name ?? emptyLabel }}</span>
                @if (s) {
                  <span class="meal">{{ meal(s.meal) }}</span>
                }
              </button>
            </li>
          }
        </ol>
        <div class="controls">
          <div class="stepper" role="group" aria-label="Seats" i18n-aria-label="@@details.seats">
            <button
              stIconButton
              icon="minus"
              size="sm"
              variant="secondary"
              aria-label="One seat fewer"
              i18n-aria-label="@@details.fewer"
              [disabled]="d.table.seats <= min"
              (click)="commands.resize(d.table.id, d.table.seats - 1)"
            ></button>
            <span class="st-mono value" aria-live="polite">{{ seatsLabel(d.table.seats) }}</span>
            <button
              stIconButton
              icon="plus"
              size="sm"
              variant="secondary"
              aria-label="One seat more"
              i18n-aria-label="@@details.more"
              [disabled]="d.table.seats >= max"
              (click)="commands.resize(d.table.id, d.table.seats + 1)"
            ></button>
          </div>
          @if (d.table.shape === 'long') {
            <button stButton size="sm" (click)="commands.rotate(d.table.id)" i18n="@@details.rotate">Turn</button>
          }
          <button stButton size="sm" variant="ghost" class="remove" (click)="commands.removeTable(d.table.id)">
            <st-icon name="trash" [size]="14" />
            <span i18n="@@details.remove">Remove</span>
          </button>
        </div>
        <p class="tip" i18n="@@details.tip">
          Drag the table top to move it, or use the arrow keys on it (Shift for more).
        </p>
      </section>
    } @else {
      <p class="empty" i18n="@@details.empty">
        Select a table to see who's sitting there and what the kitchen needs to prepare.
      </p>
    }
  `,
  styleUrl: './table-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableDetails {
  private readonly events = inject(EventStore);
  private readonly view = inject(SeatingStore);
  private readonly drag = inject(SeatingDrag);
  protected readonly commands = inject(SeatingCommands);

  protected readonly min = TABLE_SEATS.min;
  protected readonly max = TABLE_SEATS.max;
  protected readonly emptyLabel = $localize`:@@details.emptySeat:Empty`;

  protected readonly details = computed(() => {
    const doc = this.events.doc();
    const id = this.view.selectedTableId();
    const table = id ? this.events.tablesById().get(id) : undefined;
    if (!doc || !table) return null;
    const seats = seatsAt(table, doc.guests);
    const here = seats.filter((s) => s !== null);
    return {
      table,
      name: spokenTableName(table.label),
      seats,
      filled: here.length,
      meals: mealCounts(here),
      nearExit: isNearExit(table, doc.plan),
    };
  });

  constructor() {
    // Selecting a table brings its details into view in the rail.
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterRenderEffect(() => {
      if (this.view.selectedTableId()) host.scrollIntoView?.({ block: 'nearest' });
    });
  }

  protected meal(m: keyof typeof MEAL_LABEL): string {
    return MEAL_LABEL[m];
  }

  protected seatsLabel(n: number): string {
    return $localize`:@@details.seatCount:${count(n)}:n: seats`;
  }

  protected focusSeat(index: number): void {
    const t = this.details()?.table;
    if (t) this.drag.focusSeat({ tableId: t.id, index });
  }
}
