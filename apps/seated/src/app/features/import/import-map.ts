import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IMPORT_FIELDS, type ImportField } from '@seated/domain';
import { StButton, StField, StIcon, StInput } from '@seated/kit';
import { count } from '../../i18n/messages';
import { ImportWizardStore } from './import-wizard.store';
import { FIELD_LABEL, columnPreview, sharedColumns } from './import.vm';

/** Step 2: which column feeds which guest field, with a peek at the values. */
@Component({
  selector: 'st-import-map',
  imports: [StButton, StField, StIcon, StInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <div>
        <h2 class="title" tabindex="-1" data-step-heading i18n="@@import.mapHeading">Match columns</h2>
        <p class="meta st-num">{{ meta() }}</p>
      </div>
      <p class="st-muted" i18n="@@import.mapHint">We matched these by header name. Change any that look wrong.</p>
    </div>

    <ul class="fields">
      @for (f of rows(); track f.field) {
        <li class="row">
          <st-field
            [label]="f.label"
            [required]="f.field === 'name'"
            [error]="f.field === 'name' && !wizard.canReview() ? nameError : f.shared ? sharedError : null"
          >
            <select stInput #sel (change)="choose(f.field, sel.element.value)">
              <option value="" [selected]="f.column === null" i18n="@@import.dontImport">Don't import</option>
              @for (h of headers(); track $index) {
                <option [value]="$index" [selected]="f.column === $index">{{ h || untitled($index) }}</option>
              }
            </select>
          </st-field>
          <p class="preview" [class.none]="!f.preview.length">
            <span class="st-sr-only" i18n="@@import.previewLabel">Sample values:</span>
            @if (f.preview.length) {
              @for (v of f.preview; track $index) {
                <span class="value">{{ v }}</span>
              }
            } @else {
              <span i18n="@@import.noValues">Nothing to import</span>
            }
          </p>
        </li>
      }
    </ul>

    <div class="nav">
      <button type="button" stButton variant="ghost" (click)="wizard.goTo('choose')">
        <st-icon name="chevron-left" />
        <span i18n="@@import.back">Back</span>
      </button>
      <button type="button" stButton variant="primary" [disabled]="!wizard.canReview()" (click)="wizard.goTo('review')">
        <span i18n="@@import.toReview">Review rows</span>
        <st-icon name="chevron-right" />
      </button>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--st-space-5);
    }

    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--st-space-3);
    }

    .title {
      font-size: var(--st-fs-xl);
      font-weight: 600;
    }

    .title:focus {
      outline: none;
    }

    .meta {
      margin-top: var(--st-space-1);
      color: var(--st-text-3);
      font-size: var(--st-fs-sm);
    }

    .fields {
      display: grid;
      border: 1px solid var(--st-line);
      border-radius: var(--st-radius-xl);
      background: var(--st-surface);
    }

    .row {
      display: grid;
      grid-template-columns: minmax(200px, 280px) minmax(0, 1fr);
      gap: var(--st-space-2) var(--st-space-6);
      align-items: end;
      padding: var(--st-space-3) var(--st-space-4);
    }

    .row + .row {
      border-top: 1px solid var(--st-line);
    }

    @media (max-width: 720px) {
      .row {
        grid-template-columns: 1fr;
      }
    }

    .preview {
      display: flex;
      flex-wrap: wrap;
      gap: var(--st-space-1) var(--st-space-2);
      min-height: var(--st-size-control);
      align-items: center;
      color: var(--st-text-2);
      font-size: var(--st-fs-md);
    }

    .preview.none {
      color: var(--st-text-3);
    }

    .value {
      max-width: 22ch;
      overflow: hidden;
      padding: 2px var(--st-space-2);
      border-radius: var(--st-radius-sm);
      background: var(--st-surface-2);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .nav {
      display: flex;
      justify-content: space-between;
    }
  `,
})
export class ImportMap {
  protected readonly wizard = inject(ImportWizardStore);
  protected readonly headers = this.wizard.headers;
  protected readonly nameError = $localize`:@@import.needName:Choose the column with guest names to continue`;
  protected readonly sharedError = $localize`:@@import.sharedColumn:This column already feeds another field above`;

  protected readonly meta = computed(() => {
    const cols = this.headers().length;
    const rows = this.wizard.data().length;
    return $localize`:@@import.mapMeta:${this.wizard.fileName() ?? ''}:file: · ${count(cols)}:cols: columns · ${count(rows)}:rows: rows`;
  });

  protected readonly rows = computed(() => {
    const mapping = this.wizard.mapping();
    const shared = new Set(sharedColumns(mapping));
    return IMPORT_FIELDS.map((field) => ({
      field,
      label: FIELD_LABEL[field],
      column: mapping[field],
      shared: shared.has(field),
      preview: columnPreview(this.wizard.data(), mapping[field]),
    }));
  });

  protected choose(field: ImportField, value: string): void {
    this.wizard.setColumn(field, value === '' ? null : Number(value));
  }

  protected untitled(i: number): string {
    return $localize`:@@import.untitled:Column ${i + 1}:n:`;
  }
}
