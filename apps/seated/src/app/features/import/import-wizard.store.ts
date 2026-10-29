import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import {
  SAMPLE_CSV,
  SAMPLE_CSV_NAME,
  applyImport,
  findDuplicates,
  ok,
  parseCsv,
  suggestMapping,
  validateRows,
  type DuplicateDecision,
  type ImportField,
  type ImportResult,
} from '@seated/domain';
import { count } from '../../i18n/messages';
import { Actions } from '../../state/actions';
import { command } from '../../state/command';
import { EventStore } from '../../state/event-store';
import {
  canReview,
  commandLabel,
  defaultDecisions,
  filterCounts,
  guestCount,
  matchesFilter,
  reviewRows,
  summarize,
  type ImportStep,
  type ReviewFilter,
} from './import.vm';

export interface ImportOutcome {
  readonly added: number;
  readonly merged: number;
  readonly skipped: number;
}

/**
 * State for one run of the import wizard, provided by the wizard so it resets
 * when the page closes. Derived data (validation, duplicates, the summary) is
 * computed from the file, the mapping and the decisions; nothing is stored twice.
 */
@Injectable()
export class ImportWizardStore {
  private readonly store = inject(EventStore);
  private readonly actions = inject(Actions);

  readonly step = signal<ImportStep>('choose');
  readonly fileName = signal<string | null>(null);
  readonly fileError = signal<string | null>(null);
  /** Every parsed row, header first. */
  private readonly table = signal<readonly (readonly string[])[]>([]);
  readonly filter = signal<ReviewFilter>('all');
  readonly outcome = signal<ImportOutcome | null>(null);

  readonly headers = computed(() => this.table()[0] ?? []);
  readonly data = computed(() => this.table().slice(1));

  /** Suggested from the headers whenever a new file arrives; editable after that. */
  readonly mapping = linkedSignal(() => suggestMapping(this.headers()));

  readonly validated = computed(() => validateRows(this.data(), this.mapping()));
  readonly duplicates = computed(() => findDuplicates(this.validated(), this.store.guests()));

  /** Choices the person made, by row. Kept apart from the defaults so they survive an undo. */
  private readonly choices = signal<ReadonlyMap<number, DuplicateDecision>>(new Map());
  readonly decisions = computed(() => new Map([...defaultDecisions(this.duplicates()), ...this.choices()]));

  readonly review = computed(() => reviewRows(this.validated(), this.duplicates(), this.decisions()));
  readonly summary = computed(() => summarize(this.review()));
  readonly counts = computed(() => filterCounts(this.review()));
  readonly visible = computed(() => this.review().filter((r) => matchesFilter(r, this.filter())));
  readonly canReview = computed(() => canReview(this.mapping()));

  load(name: string, text: string): void {
    const rows = parseCsv(text);
    if (rows.length < 2) {
      this.fileError.set(
        rows.length === 0
          ? $localize`:@@import.emptyFile:${name}:file: is empty. Choose a CSV with a header row and at least one guest.`
          : $localize`:@@import.headerOnly:${name}:file: only has a header row. Add at least one guest and try again.`,
      );
      return;
    }
    this.fileError.set(null);
    this.fileName.set(name);
    this.table.set(rows);
    this.choices.set(new Map());
    this.filter.set('all');
    this.outcome.set(null);
    this.step.set('map');
  }

  useSample(): void {
    this.load(SAMPLE_CSV_NAME, SAMPLE_CSV);
  }

  setColumn(field: ImportField, column: number | null): void {
    this.mapping.update((m) => ({ ...m, [field]: column }));
  }

  decide(rowIndex: number, decision: DuplicateDecision): void {
    this.choices.update((d) => new Map(d).set(rowIndex, decision));
  }

  goTo(step: ImportStep): void {
    if (step === 'review' && !this.canReview()) return;
    this.step.set(step);
  }

  /** Adds and merges in one undoable step. */
  run(): boolean {
    const s = this.summary();
    if (s.added + s.merged === 0) return false;
    const rows = this.validated();
    const decisions = this.decisions();
    const captured: { result?: ImportResult } = {};
    const done =
      s.merged > 0
        ? $localize`:@@import.doneMerge:Imported ${guestCount(s.added)}:added: and updated ${count(s.merged)}:merged:`
        : $localize`:@@import.done:Imported ${guestCount(s.added)}:added:`;
    const r = this.actions.run(
      command(commandLabel(s), (event) => {
        captured.result = applyImport(event, rows, decisions);
        return ok(captured.result.event);
      }),
      done,
    );
    if (!r.ok || !captured.result) return false;
    const { added, merged, skipped } = captured.result;
    this.outcome.set({ added: added.length, merged: merged.length, skipped: skipped.length });
    this.step.set('done');
    return true;
  }

  /** Undo the import and go back to the review, decisions intact. */
  undo(): void {
    this.actions.undo();
    this.outcome.set(null);
    this.step.set('review');
  }

  reset(): void {
    this.table.set([]);
    this.fileName.set(null);
    this.fileError.set(null);
    this.outcome.set(null);
    this.filter.set('all');
    this.step.set('choose');
  }
}
