import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { DuplicateDecision, ImportError, ImportField } from '@seated/domain';
import { StButton, StIcon, StPill, StSegmented, type SegmentedOption } from '@seated/kit';
import { IMPORT_ERROR, MEAL_LABEL, RSVP_LABEL, count } from '../../i18n/messages';
import { EventStore } from '../../state/event-store';
import { ImportWizardStore } from './import-wizard.store';
import { duplicateHint, summaryText, type ReviewFilter, type ReviewRow, type RowStatus } from './import.vm';

const STATUS: Record<RowStatus, { label: string; tone: 'ok' | 'warn' | '3' }> = {
  ready: { label: $localize`:@@import.status.ready:Ready`, tone: 'ok' },
  fix: { label: $localize`:@@import.status.fix:Fix`, tone: 'warn' },
  duplicate: { label: $localize`:@@import.status.duplicate:Duplicate`, tone: '3' },
};

/** Step 3: every row with its status, per-field problems and a choice for each duplicate. */
@Component({
  selector: 'st-import-review',
  imports: [StButton, StIcon, StPill, StSegmented],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './import-review.html',
  styleUrl: './import-review.scss',
})
export class ImportReview {
  protected readonly wizard = inject(ImportWizardStore);
  private readonly store = inject(EventStore);

  protected readonly status = STATUS;
  protected readonly rsvp = RSVP_LABEL;
  protected readonly meal = MEAL_LABEL;

  protected readonly summary = computed(() => summaryText(this.wizard.summary()));
  protected readonly importCount = computed(() => this.wizard.summary().added + this.wizard.summary().merged);
  protected readonly importLabel = computed(() => $localize`:@@import.run:Import ${count(this.importCount())}:n: rows`);

  protected readonly filters = computed<SegmentedOption<ReviewFilter>[]>(() => {
    const c = this.wizard.counts();
    return [
      { value: 'all', label: $localize`:@@import.filter.all:All`, count: c.all },
      { value: 'problems', label: $localize`:@@import.filter.problems:Problems`, count: c.problems },
      { value: 'duplicates', label: $localize`:@@import.filter.dupes:Duplicates`, count: c.duplicates },
    ];
  });

  protected readonly decisions: readonly SegmentedOption<DuplicateDecision>[] = [
    { value: 'merge', label: $localize`:@@import.merge:Merge` },
    { value: 'keep-both', label: $localize`:@@import.keepBoth:Keep both` },
    { value: 'skip', label: $localize`:@@import.skip:Skip` },
  ];

  protected errorsFor(r: ReviewRow, field: ImportField): ImportError[] {
    return r.row.errors.filter((e) => e.field === field);
  }

  protected errorText(e: ImportError): string {
    return IMPORT_ERROR[e.code];
  }

  protected hint(r: ReviewRow): string {
    if (!r.duplicate) return '';
    const existing = this.store.guestsById().get(r.duplicate.guestId)?.name ?? '';
    return duplicateHint(r.duplicate, existing);
  }

  protected decisionLabel(r: ReviewRow): string {
    return $localize`:@@import.decisionLabel:What to do with line ${r.line}:line:, ${r.row.values.name}:name:`;
  }

  protected outcome(r: ReviewRow): string {
    switch (r.outcome) {
      case 'new':
        return $localize`:@@import.outcome.new:Adds a guest`;
      case 'merge':
        return $localize`:@@import.outcome.merge:Updates the guest`;
      case 'skip-missing':
        return $localize`:@@import.outcome.skipMissing:Skipped, no name`;
      case 'skip-duplicate':
        return $localize`:@@import.outcome.skipDup:Skipped`;
    }
  }
}
