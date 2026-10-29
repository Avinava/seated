import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
  CdkVirtualScrollableElement,
} from '@angular/cdk/scrolling';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  contentChildren,
  input,
  model,
  numberAttribute,
  output,
  signal,
  viewChild,
  type TemplateRef,
} from '@angular/core';
import { StCheckbox } from '../../forms/checkbox/checkbox';
import { StIcon } from '../../icons/icon/icon';
import { StCell, StHeaderCell, type StCellContext, type StHeaderCellContext } from './grid-cell';
import {
  isGridGroupRow,
  nextSort,
  type GridColumn,
  type GridGroupRow,
  type GridRow,
  type GridSort,
} from './grid-types';

/** One rendered line of the grid: a group heading or a data row. */
export type GridItem<T> =
  | { readonly kind: 'group'; readonly index: number; readonly group: GridGroupRow }
  | { readonly kind: 'row'; readonly index: number; readonly key: string; readonly dataIndex: number; readonly row: T };

let nextGridId = 0;

/**
 * A virtualised, keyboard-first data grid.
 *
 * - One tab stop: the grid itself, with the active row exposed through
 *   `aria-activedescendant`. Arrows, Home/End and PageUp/PageDown move it;
 *   Space toggles selection, Shift+arrows extend it, Mod+A selects all,
 *   Escape clears, Enter emits `rowActivate`.
 * - Sorting is controlled: the grid emits `sort` and the owner sorts `rows`.
 * - `rows` may mix in group headings (`gridGroup(...)`) which are never selected.
 *
 * ```html
 * <st-data-grid label="Guests" [rows]="rows()" [columns]="cols" rowKey="id"
 *               [(selection)]="picked" [(sort)]="sort" (rowActivate)="open($event)">
 *   <ng-container *stCell="'name'; of: rows(); let g">{{ g.name }}</ng-container>
 * </st-data-grid>
 * ```
 */
@Component({
  selector: 'st-data-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkVirtualScrollViewport,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollableElement,
    NgTemplateOutlet,
    StCheckbox,
    StIcon,
  ],
  host: {
    class: 'st-data-grid',
    '[style.--st-grid-cols]': 'templateColumns()',
    '[style.--st-grid-row-h.px]': 'rowHeight()',
  },
  templateUrl: './data-grid.html',
  styleUrl: './data-grid.scss',
})
export class StDataGrid<T> {
  /** Data rows, optionally mixed with group headings. */
  readonly rows = input.required<readonly GridRow<T>[]>();
  readonly columns = input.required<readonly GridColumn[]>();
  /** The row property that uniquely identifies a row; its value keys selection. */
  readonly rowKey = input.required<keyof T & string>();
  /** Accessible name of the grid. */
  readonly label = input.required<string>();
  /** Fixed row height in px; virtual scrolling depends on it. */
  readonly rowHeight = input(44, { transform: numberAttribute });
  /** Adds the selection column, select-all and multi-select keys. */
  readonly selectable = input(true, { transform: booleanAttribute });
  readonly emptyText = input($localize`:@@kit.grid.empty:Nothing to show`);

  /** Keys of the selected rows. Replace the set to change it; never mutate it. */
  readonly selection = model<ReadonlySet<string>>(new Set());
  readonly sort = model<GridSort | null>(null);
  /** Enter on the active row, or a click on a row. */
  readonly rowActivate = output<T>();

  protected readonly id = `st-grid-${nextGridId++}`;
  protected readonly selectAllLabel = $localize`:@@kit.grid.selectAll:Select all rows`;

  private readonly cellDefs = contentChildren(StCell);
  private readonly headerDefs = contentChildren(StHeaderCell);
  private readonly viewport = viewChild(CdkVirtualScrollViewport);
  private readonly scroller = viewChild(CdkVirtualScrollableElement);

  /** Key of the active (keyboard-focused) row. Survives sorting and filtering. */
  private readonly activeKey = signal<string | null>(null);
  private readonly anchorKey = signal<string | null>(null);
  protected readonly focused = signal(false);

  protected readonly items = computed<readonly GridItem<T>[]>(() => {
    const key = this.rowKey();
    let dataIndex = 0;
    return this.rows().map((row, index) =>
      isGridGroupRow(row)
        ? { kind: 'group', index, group: row }
        : { kind: 'row', index, key: String((row as T)[key]), dataIndex: dataIndex++, row: row as T },
    );
  });

  private readonly dataItems = computed(() =>
    this.items().filter((i): i is Extract<GridItem<T>, { kind: 'row' }> => i.kind === 'row'),
  );
  private readonly positionByKey = computed(() => new Map(this.dataItems().map((item, pos) => [item.key, pos])));

  /** Header plus every line (or the single "empty" line). */
  protected readonly rowCount = computed(() => Math.max(this.items().length, 1) + 1);
  protected readonly colCount = computed(() => this.columns().length + (this.selectable() ? 1 : 0));

  protected readonly templateColumns = computed(() => {
    const tracks = this.columns().map((c) => c.width ?? 'minmax(0, 1fr)');
    return (this.selectable() ? ['44px', ...tracks] : tracks).join(' ');
  });

  protected readonly cellTemplates = computed(() => {
    const map = new Map<string, TemplateRef<StCellContext<unknown>>>();
    for (const def of this.cellDefs()) map.set(def.stCell(), def.template);
    return map;
  });

  protected readonly headerTemplates = computed(() => {
    const map = new Map<string, TemplateRef<StHeaderCellContext>>();
    for (const def of this.headerDefs()) map.set(def.stHeaderCell(), def.template);
    return map;
  });

  protected readonly selectedCount = computed(() => {
    const sel = this.selection();
    return this.dataItems().reduce((n, i) => (sel.has(i.key) ? n + 1 : n), 0);
  });
  protected readonly allSelected = computed(() => {
    const n = this.dataItems().length;
    return n > 0 && this.selectedCount() === n;
  });
  protected readonly someSelected = computed(() => this.selectedCount() > 0 && !this.allSelected());

  protected readonly activeIndex = computed(() => {
    const key = this.activeKey();
    if (key === null) return -1;
    const pos = this.positionByKey().get(key);
    return pos === undefined ? -1 : (this.dataItems()[pos]?.index ?? -1);
  });

  protected readonly activeDescendant = computed(() =>
    this.focused() && this.activeIndex() >= 0 ? this.rowId(this.activeIndex()) : null,
  );

  protected rowId(index: number): string {
    return `${this.id}-row-${index}`;
  }

  protected trackItem = (_: number, item: GridItem<T>): string =>
    item.kind === 'row' ? `r:${item.key}` : `g:${item.group.id}`;

  protected text(row: T, key: string): string {
    const value = (row as Record<string, unknown>)[key];
    return value === null || value === undefined ? '' : String(value);
  }

  protected ariaSort(key: string): 'ascending' | 'descending' | 'none' {
    const s = this.sort();
    if (s?.key !== key) return 'none';
    return s.dir === 'asc' ? 'ascending' : 'descending';
  }

  protected cycleSort(key: string): void {
    this.sort.set(nextSort(this.sort(), key));
  }

  protected setAll(checked: boolean): void {
    this.selection.set(checked ? new Set(this.dataItems().map((i) => i.key)) : new Set());
  }

  // Focus -------------------------------------------------------------------

  protected onFocus(): void {
    this.focused.set(true);
    if (this.activeIndex() < 0) {
      const first = this.dataItems()[0];
      if (first) this.activeKey.set(first.key);
    }
  }

  protected onBlur(): void {
    this.focused.set(false);
  }

  // Pointer -----------------------------------------------------------------

  /** One delegated listener for every rendered row, so 1,000 rows add no handlers. */
  protected onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const rowEl = target.closest<HTMLElement>('[data-row-key]');
    const key = rowEl?.dataset['rowKey'];
    if (key === undefined) return;
    const item = this.itemByKey(key);
    if (!item) return;
    this.activeKey.set(key);
    if (this.selectable() && target.closest('.select-cell')) {
      const anchor = this.anchorKey();
      if (event.shiftKey && anchor !== null) this.selectRange(anchor, key);
      else this.toggle(key);
      this.anchorKey.set(key);
      return;
    }
    this.rowActivate.emit(item.row);
  }

  // Keyboard ----------------------------------------------------------------

  protected onKeydown(event: KeyboardEvent): void {
    // Keys on the header's own controls (sort buttons, select-all) keep their native meaning.
    if (event.target !== event.currentTarget) return;
    const data = this.dataItems();
    if (data.length === 0) return;
    const activeKey = this.activeKey();
    const pos = activeKey === null ? -1 : (this.positionByKey().get(activeKey) ?? -1);
    const current = data[pos];
    const mod = event.metaKey || event.ctrlKey;
    let next: number | null = null;

    switch (event.key) {
      case 'ArrowDown':
        next = pos < 0 ? 0 : pos + 1;
        break;
      case 'ArrowUp':
        next = pos < 0 ? 0 : pos - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = data.length - 1;
        break;
      case 'PageDown':
        next = Math.max(pos, 0) + this.pageSize();
        break;
      case 'PageUp':
        next = Math.max(pos, 0) - this.pageSize();
        break;
      case ' ':
        if (current && this.selectable()) {
          this.toggle(current.key);
          this.anchorKey.set(current.key);
        }
        break;
      case 'Enter':
        if (current) this.rowActivate.emit(current.row);
        break;
      case 'Escape':
        if (this.selection().size === 0) return;
        this.selection.set(new Set());
        break;
      case 'a':
      case 'A':
        if (!mod || !this.selectable()) return;
        this.setAll(true);
        break;
      default:
        return;
    }
    event.preventDefault();

    if (next === null) return;
    const clamped = Math.min(Math.max(next, 0), data.length - 1);
    const item = data[clamped];
    if (!item) return;
    if (event.shiftKey && this.selectable() && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      const anchor = this.anchorKey() ?? current?.key ?? item.key;
      this.anchorKey.set(anchor);
      this.selectRange(anchor, item.key);
    }
    this.activeKey.set(item.key);
    this.scrollIntoView(item.index);
  }

  // Selection ---------------------------------------------------------------

  private toggle(key: string): void {
    const next = new Set(this.selection());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.selection.set(next);
  }

  /** Adds every data row between two keys (inclusive) to the selection. */
  private selectRange(fromKey: string, toKey: string): void {
    const positions = this.positionByKey();
    const a = positions.get(fromKey);
    const b = positions.get(toKey);
    if (a === undefined || b === undefined) return;
    const next = new Set(this.selection());
    for (const item of this.dataItems().slice(Math.min(a, b), Math.max(a, b) + 1)) next.add(item.key);
    this.selection.set(next);
  }

  private itemByKey(key: string) {
    const pos = this.positionByKey().get(key);
    return pos === undefined ? undefined : this.dataItems()[pos];
  }

  // Scrolling ---------------------------------------------------------------

  private pageSize(): number {
    const size = this.scroller()?.measureViewportSize('vertical') ?? 0;
    return Math.max(1, Math.floor(size / this.rowHeight()) - 1);
  }

  /** Scrolls the least distance that brings the row fully into view. */
  private scrollIntoView(index: number): void {
    const viewport = this.viewport();
    const scroller = this.scroller();
    if (!viewport || !scroller) return;
    const size = scroller.measureViewportSize('vertical');
    if (size === 0) return;
    const h = this.rowHeight();
    // Rows start below the sticky header, which also covers the top of the scroller.
    const header = viewport.measureViewportOffset('top');
    const scrollTop = scroller.measureScrollOffset('top');
    const top = header + index * h;
    if (top < scrollTop + header) viewport.scrollToOffset(top - header);
    else if (top + h > scrollTop + size) viewport.scrollToOffset(top + h - size);
  }
}
