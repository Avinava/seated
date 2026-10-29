/** A column of `st-data-grid`. `key` names the row property (or the cell template). */
export interface GridColumn {
  readonly key: string;
  readonly header: string;
  /** Any CSS grid track size: "120px", "2fr", "minmax(160px, 2fr)". Defaults to an equal share. */
  readonly width?: string;
  readonly sortable?: boolean;
  readonly align?: 'start' | 'end';
}

export type GridSortDir = 'asc' | 'desc';

export interface GridSort {
  readonly key: string;
  readonly dir: GridSortDir;
}

/** A full-width heading row that groups the data rows below it. Not selectable. */
export interface GridGroupRow {
  readonly kind: 'group';
  readonly id: string;
  readonly label: string;
  readonly count: number;
}

/** What the `rows` input accepts: data rows mixed with optional group headings. */
export type GridRow<T> = T | GridGroupRow;

export function gridGroup(id: string, label: string, count: number): GridGroupRow {
  return { kind: 'group', id, label, count };
}

export function isGridGroupRow(row: unknown): row is GridGroupRow {
  return (
    typeof row === 'object' &&
    row !== null &&
    (row as Partial<GridGroupRow>).kind === 'group' &&
    typeof (row as Partial<GridGroupRow>).count === 'number'
  );
}

/** The next sort state when a header is activated: asc, then desc, then unsorted. */
export function nextSort(current: GridSort | null, key: string): GridSort | null {
  if (current?.key !== key) return { key, dir: 'asc' };
  return current.dir === 'asc' ? { key, dir: 'desc' } : null;
}
