import { ChangeDetectionStrategy, Component } from '@angular/core';
import { StSkeleton } from '@seated/kit';
import { EventFile } from './event-file';
import { ImportWizard } from './import-wizard';

/**
 * Import guests from a CSV in three checked steps, or move the whole event
 * with a Seated file. The wizard is deferred: it loads after the page shell,
 * so the route opens instantly.
 */
@Component({
  selector: 'st-import-page',
  imports: [EventFile, ImportWizard, StSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="head">
        <h1 class="title st-display" i18n="@@import.title">Import guests</h1>
        <p class="lede" i18n="@@import.lede">
          Bring in a guest list from a spreadsheet. Nothing changes until you've checked every row, and the whole import
          is one step you can undo.
        </p>
      </header>

      @defer (on immediate) {
        <st-import-wizard />
      } @placeholder {
        <div class="placeholder" aria-busy="true">
          <span class="st-sr-only" i18n="@@import.loading">Loading the importer</span>
          <st-skeleton width="360px" height="22px" />
          <st-skeleton shape="block" height="320px" />
        </div>
      }

      <st-event-file />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .page {
      display: grid;
      gap: var(--st-space-8);
      max-width: 1120px;
      padding: var(--st-space-8);
    }

    @media (max-width: 720px) {
      .page {
        padding: var(--st-space-6) var(--st-space-4);
      }
    }

    .head {
      display: grid;
      gap: var(--st-space-2);
      max-width: 62ch;
    }

    .title {
      font-size: var(--st-fs-4xl);
    }

    .lede {
      color: var(--st-text-2);
      font-size: var(--st-fs-lg);
      text-wrap: pretty;
    }

    .placeholder {
      display: grid;
      gap: var(--st-space-6);
    }
  `,
})
export default class ImportPage {}
