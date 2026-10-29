import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StButton, StIcon, StStat } from '@seated/kit';
import { count } from '../../i18n/messages';
import { ImportWizardStore } from './import-wizard.store';

/** The result: what changed, a way back, and the next places to go. */
@Component({
  selector: 'st-import-done',
  imports: [RouterLink, StButton, StIcon, StStat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (wizard.outcome(); as o) {
      <span class="badge" aria-hidden="true"><st-icon name="check" [size]="24" /></span>
      <h2 class="title st-display" tabindex="-1" data-step-heading i18n="@@import.finished">Import finished</h2>
      <p class="st-muted" i18n="@@import.finishedBody">
        New guests are marked as awaiting RSVP unless the file said otherwise. Nobody has a seat yet.
      </p>
      <div class="stats">
        <st-stat label="Added" i18n-label="@@import.statAdded" [value]="fmt(o.added)" />
        <st-stat label="Updated" i18n-label="@@import.statMerged" [value]="fmt(o.merged)" />
        <st-stat label="Skipped" i18n-label="@@import.statSkipped" [value]="fmt(o.skipped)" />
      </div>
      <div class="actions">
        <a stButton variant="primary" routerLink="../seating">
          <span i18n="@@import.toSeating">Seat them</span>
          <st-icon name="chevron-right" />
        </a>
        <a stButton routerLink="../guests" i18n="@@import.toGuests">View guests</a>
        <button type="button" stButton (click)="wizard.undo()">
          <st-icon name="undo" />
          <span i18n="@@import.undo">Undo import</span>
        </button>
        <button type="button" stButton variant="ghost" (click)="wizard.reset()" i18n="@@import.another">
          Import another file
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      display: grid;
      justify-items: start;
      gap: var(--st-space-4);
      max-width: 640px;
      padding: var(--st-space-8);
      border: 1px solid var(--st-line);
      border-radius: var(--st-radius-2xl);
      background: var(--st-surface);
      animation: st-fade-up var(--st-dur-slow) var(--st-ease-settle);
    }

    .badge {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--st-ok-soft);
      color: var(--st-ok);
    }

    .title {
      font-size: var(--st-fs-3xl);
    }

    .title:focus {
      outline: none;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(120px, 1fr));
      gap: var(--st-space-3);
      align-self: stretch;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--st-space-2);
    }
  `,
})
export class ImportDone {
  protected readonly wizard = inject(ImportWizardStore);
  protected readonly fmt = count;
}
