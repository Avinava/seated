import {
  IMPORT_FIELDS,
  isImportable,
  type Duplicate,
  type DuplicateDecision,
  type FormatError,
  type ImportField,
  type ImportMapping,
  type ImportRow,
} from '@seated/domain';
import { count } from '../../i18n/messages';

export type ImportStep = 'choose' | 'map' | 'review' | 'done';
export const IMPORT_STEPS: readonly ImportStep[] = ['choose', 'map', 'review', 'done'];

export const STEP_LABEL: Record<ImportStep, string> = {
  choose: $localize`:@@import.step.choose:Choose file`,
  map: $localize`:@@import.step.map:Match columns`,
  review: $localize`:@@import.step.review:Review`,
  done: $localize`:@@import.step.done:Done`,
};

export const FIELD_LABEL: Record<ImportField, string> = {
  name: $localize`:@@import.field.name:Name`,
  email: $localize`:@@import.field.email:Email`,
  party: $localize`:@@import.field.party:Party or household`,
  group: $localize`:@@import.field.group:Group or side`,
  rsvp: $localize`:@@import.field.rsvp:RSVP`,
  meal: $localize`:@@import.field.meal:Meal`,
  dietary: $localize`:@@import.field.dietary:Dietary needs`,
  tags: $localize`:@@import.field.tags:Tags`,
  access: $localize`:@@import.field.access:Step-free access`,
  notes: $localize`:@@import.field.notes:Notes`,
};

/** The first few non-blank values in a column, for the mapping preview. */
export function columnPreview(rows: readonly (readonly string[])[], column: number | null, n = 3): string[] {
  if (column === null) return [];
  const out: string[] = [];
  for (const row of rows) {
    const v = (row[column] ?? '').trim();
    if (v) out.push(v);
    if (out.length === n) break;
  }
  return out;
}

/** Fields that point at the same column as an earlier field; each column feeds one field. */
export function sharedColumns(mapping: ImportMapping): ImportField[] {
  const seen = new Set<number>();
  return IMPORT_FIELDS.filter((f) => {
    const c = mapping[f];
    if (c === null) return false;
    if (seen.has(c)) return true;
    seen.add(c);
    return false;
  });
}

export function canReview(mapping: ImportMapping): boolean {
  return mapping.name !== null;
}

/**
 * Merge when the email matches, since that is almost surely the same person.
 * A name match alone is skipped: two Priya Shahs at one wedding is common.
 */
export function defaultDecisions(dupes: readonly Duplicate[]): Map<number, DuplicateDecision> {
  return new Map(dupes.map((d) => [d.rowIndex, d.by === 'email' ? 'merge' : 'skip']));
}

export type RowStatus = 'ready' | 'fix' | 'duplicate';
export type RowOutcome = 'new' | 'merge' | 'skip-missing' | 'skip-duplicate';

export interface ReviewRow {
  readonly index: number;
  /** Line in the file, counting the header as line 1. */
  readonly line: number;
  readonly row: ImportRow;
  readonly status: RowStatus;
  readonly duplicate: Duplicate | null;
  readonly decision: DuplicateDecision | null;
  readonly outcome: RowOutcome;
}

export function reviewRows(
  rows: readonly ImportRow[],
  dupes: readonly Duplicate[],
  decisions: ReadonlyMap<number, DuplicateDecision>,
): ReviewRow[] {
  const byRow = new Map(dupes.map((d) => [d.rowIndex, d]));
  return rows.map((row) => {
    const duplicate = byRow.get(row.index) ?? null;
    const decision = duplicate ? (decisions.get(row.index) ?? 'skip') : null;
    let outcome: RowOutcome;
    if (!isImportable(row)) outcome = 'skip-missing';
    else if (decision === 'skip') outcome = 'skip-duplicate';
    else if (decision === 'merge') outcome = 'merge';
    else outcome = 'new';
    const status: RowStatus = row.errors.length ? 'fix' : duplicate ? 'duplicate' : 'ready';
    return { index: row.index, line: row.index + 2, row, status, duplicate, decision, outcome };
  });
}

export interface ImportSummary {
  readonly total: number;
  readonly added: number;
  readonly merged: number;
  readonly missing: number;
  readonly duplicates: number;
}

export function summarize(rows: readonly ReviewRow[]): ImportSummary {
  const n = (o: RowOutcome): number => rows.filter((r) => r.outcome === o).length;
  return {
    total: rows.length,
    added: n('new'),
    merged: n('merge'),
    missing: n('skip-missing'),
    duplicates: n('skip-duplicate'),
  };
}

export function guestCount(n: number): string {
  return n === 1 ? $localize`:@@import.oneGuest:1 guest` : $localize`:@@import.nGuests:${count(n)}:n: guests`;
}

/** "12 rows: 9 new, 1 to merge, 2 skipped (1 missing name, 1 duplicate)". */
export function summaryText(s: ImportSummary): string {
  const rows = s.total === 1 ? $localize`:@@import.oneRow:1 row` : $localize`:@@import.nRows:${count(s.total)}:n: rows`;
  const parts = [$localize`:@@import.sumNew:${count(s.added)}:n: new`];
  if (s.merged) parts.push($localize`:@@import.sumMerge:${count(s.merged)}:n: to merge`);
  const skipped = s.missing + s.duplicates;
  if (skipped) {
    const why: string[] = [];
    if (s.missing) why.push($localize`:@@import.sumMissing:${count(s.missing)}:n: missing name`);
    if (s.duplicates) {
      why.push(
        s.duplicates === 1
          ? $localize`:@@import.sumDup:1 duplicate`
          : $localize`:@@import.sumDups:${count(s.duplicates)}:n: duplicates`,
      );
    }
    parts.push($localize`:@@import.sumSkipped:${count(skipped)}:n: skipped (${why.join(', ')}:why:)`);
  }
  return `${rows}: ${parts.join(', ')}`;
}

/** What undo will say, e.g. "Undid: import 9 guests". */
export function commandLabel(s: Pick<ImportSummary, 'added' | 'merged'>): string {
  if (!s.merged) return $localize`:@@import.cmd:import ${guestCount(s.added)}:guests:`;
  return $localize`:@@import.cmdMerge:import ${guestCount(s.added)}:guests: and update ${count(s.merged)}:n:`;
}

export type ReviewFilter = 'all' | 'problems' | 'duplicates';

export function matchesFilter(row: ReviewRow, filter: ReviewFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'problems':
      return row.row.errors.length > 0;
    case 'duplicates':
      return row.duplicate !== null;
  }
}

export function filterCounts(rows: readonly ReviewRow[]): Record<ReviewFilter, number> {
  return {
    all: rows.length,
    problems: rows.filter((r) => matchesFilter(r, 'problems')).length,
    duplicates: rows.filter((r) => matchesFilter(r, 'duplicates')).length,
  };
}

/** Why a duplicate got its default, shown under the decision. */
export function duplicateHint(d: Duplicate, existing: string): string {
  return d.by === 'email'
    ? $localize`:@@import.dupEmail:Same email as ${existing}:name:. Merging updates their details.`
    : $localize`:@@import.dupName:Same name as ${existing}:name:, different or no email. Skipped unless you choose.`;
}

/** "seated-ananya-and-kabir-s-wedding-2026-10-29.json". */
export function exportFileName(eventSlug: string, now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `seated-${eventSlug}-${y}-${m}-${d}.json`;
}

/** A restore failure in words; the first problem is enough to act on. */
export function restoreError(errors: readonly FormatError[]): string {
  switch (errors[0]?.code) {
    case 'invalid-json':
    case 'wrong-format':
      return $localize`:@@import.restore.notSeated:That is not a Seated export file. Choose a .json file made with "Export event".`;
    case 'unsupported-version':
      return $localize`:@@import.restore.newer:That file comes from a newer version of Seated. Update and try again.`;
    default:
      return $localize`:@@import.restore.damaged:That file is damaged (${errors[0]?.path ?? ''}:path:). Export it again from the device it came from.`;
  }
}
