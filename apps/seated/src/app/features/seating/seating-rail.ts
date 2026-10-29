import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { StSegmented } from '@seated/kit';
import { EventStore } from '../../state/event-store';
import { AutoSeatCard } from './auto-seat-card';
import { RulesPanel } from './rules-panel';
import { SeatingStore } from './seating.store';
import { COLOR_OPTIONS, legend } from './seating.vm';
import { TableDetails } from './table-details';

/** The right rail: auto-seat, rules, the selected table and the seat colour legend. */
@Component({
  selector: 'st-seating-rail',
  imports: [AutoSeatCard, RulesPanel, TableDetails, StSegmented],
  template: `
    <st-auto-seat-card />
    <st-rules-panel />
    <st-table-details />
    <section class="colours" aria-labelledby="colours-title">
      <div class="row">
        <h2 id="colours-title" class="title" i18n="@@colours.heading">Seat colours</h2>
        @if (showToggle()) {
          <st-segmented
            aria-label="Colour seats by"
            i18n-aria-label="@@colours.by"
            [options]="options"
            [value]="view.colorBy()"
            (valueChange)="$event && view.setColorBy($event)"
          />
        }
      </div>
      <ul class="legend">
        @for (l of legend(); track l.label) {
          <li><span class="dot" [attr.data-tone]="l.tone" aria-hidden="true"></span>{{ l.label }}</li>
        }
      </ul>
    </section>
  `,
  styles: `
    :host {
      display: grid;
      align-content: start;
      gap: var(--st-space-6);
    }

    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--st-space-2);
      margin-bottom: var(--st-space-3);
    }

    .title {
      margin: 0;
      font-size: var(--st-fs-base);
      font-weight: 600;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--st-space-2) var(--st-space-4);
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: var(--st-fs-xs);
      color: var(--st-text-2);
    }

    li {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .dot {
      width: 10px;
      height: 10px;
      border: 1.5px dashed var(--st-line-2);
      border-radius: 50%;
      background: var(--st-surface-2);
    }

    @for $i from 1 through 4 {
      .dot[data-tone='#{$i}'] {
        border: 1.5px solid var(--st-cat-#{$i});
        background: var(--st-cat-#{$i}-soft);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeatingRail {
  private readonly events = inject(EventStore);
  protected readonly view = inject(SeatingStore);
  /** Show the colour toggle here too (when the toolbar has no room for it). */
  readonly showToggle = input(false, { transform: booleanAttribute });

  protected readonly options = COLOR_OPTIONS;
  protected readonly legend = computed(() => legend(this.view.colorBy(), this.events.groups()));
}
