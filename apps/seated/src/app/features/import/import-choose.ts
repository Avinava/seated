import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SAMPLE_CSV_NAME } from '@seated/domain';
import { StButton, StIcon } from '@seated/kit';
import { ImportWizardStore } from './import-wizard.store';

/** Step 1: drop a CSV, choose one with the file picker, or try the sample. */
@Component({
  selector: 'st-import-choose',
  imports: [StButton, StIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="st-sr-only" tabindex="-1" data-step-heading i18n="@@import.chooseHeading">Choose a file</h2>
    <div
      class="drop"
      [class.is-over]="over()"
      (dragenter)="onDrag($event, true)"
      (dragover)="onDrag($event, true)"
      (dragleave)="over.set(false)"
      (drop)="onDrop($event)"
    >
      <span class="badge" aria-hidden="true"><st-icon name="upload" [size]="22" /></span>
      <p class="title st-display" i18n="@@import.dropTitle">Drop a CSV here</p>
      <p class="hint" i18n="@@import.dropHint">
        A spreadsheet export works. You'll match its columns to guest fields, then check every row before anything
        changes.
      </p>
      <div class="actions">
        <input
          #picker
          class="st-sr-only"
          type="file"
          accept=".csv,text/csv"
          tabindex="-1"
          aria-hidden="true"
          (change)="onPick(picker)"
        />
        <button type="button" stButton variant="primary" (click)="picker.click()">
          <st-icon name="upload" />
          <span i18n="@@import.chooseFile">Choose file</span>
        </button>
        <button type="button" stButton (click)="wizard.useSample()">
          <span i18n="@@import.useSample">Use sample: {{ sampleName }}</span>
        </button>
      </div>
    </div>
    @if (wizard.fileError(); as error) {
      <p class="error" role="alert"><st-icon name="alert" />{{ error }}</p>
    }
    <ul class="facts">
      <li i18n="@@import.factRequired">Required: <strong>name</strong></li>
      <li i18n="@@import.factOptional">Optional: email, party, group, RSVP, meal, dietary, tags, access, notes</li>
      <li i18n="@@import.factDupes">Existing guests are matched by email, then by name</li>
    </ul>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--st-space-4);
    }

    .drop {
      display: grid;
      justify-items: center;
      gap: var(--st-space-3);
      padding: var(--st-space-12) var(--st-space-6);
      border: 1.5px dashed var(--st-line-2);
      border-radius: var(--st-radius-2xl);
      background: var(--st-surface);
      text-align: center;
      transition:
        border-color var(--st-dur-fast) var(--st-ease-settle),
        background-color var(--st-dur-fast) var(--st-ease-settle);
    }

    .drop.is-over {
      border-style: solid;
      border-color: var(--st-accent);
      background: var(--st-accent-soft);
    }

    .badge {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: var(--st-radius-xl);
      background: var(--st-surface-2);
      color: var(--st-text-2);
    }

    .title {
      font-size: var(--st-fs-2xl);
    }

    .hint {
      max-width: 46ch;
      color: var(--st-text-2);
      text-wrap: pretty;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--st-space-2);
      margin-top: var(--st-space-2);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--st-space-2);
      color: var(--st-danger);
      font-weight: 500;
    }

    .facts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--st-space-2) var(--st-space-6);
      color: var(--st-text-3);
      font-size: var(--st-fs-sm);
    }

    .facts strong {
      color: var(--st-text);
      font-weight: 600;
    }
  `,
})
export class ImportChoose {
  protected readonly wizard = inject(ImportWizardStore);
  protected readonly over = signal(false);
  protected readonly sampleName = SAMPLE_CSV_NAME;

  protected onDrag(event: DragEvent, over: boolean): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.over.set(over);
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.over.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) await this.read(file);
  }

  protected async onPick(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (file) await this.read(file);
  }

  private async read(file: File): Promise<void> {
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      this.wizard.fileError.set(
        $localize`:@@import.notCsv:${file.name}:file: is not a CSV. Export your spreadsheet as CSV and try again.`,
      );
      return;
    }
    this.wizard.load(file.name, await file.text());
  }
}
