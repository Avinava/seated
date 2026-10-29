import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { StCell, StHeaderCell } from './grid-cell';
import { StDataGrid } from './data-grid';
import { gridGroup, isGridGroupRow, nextSort, type GridColumn, type GridRow, type GridSort } from './grid-types';

interface Guest {
  readonly id: string;
  readonly name: string;
  readonly table: number;
}

const ROWS: GridRow<Guest>[] = [
  gridGroup('family', 'Family', 3),
  { id: 'g1', name: 'Aarav Shah', table: 1 },
  { id: 'g2', name: 'Diya Iyer', table: 1 },
  { id: 'g3', name: 'Kabir Rao', table: 2 },
  gridGroup('work', 'Work', 2),
  { id: 'g4', name: 'Meera Nair', table: 3 },
  { id: 'g5', name: 'Rohan Das', table: 3 },
];

@Component({
  imports: [StDataGrid, StCell, StHeaderCell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="height: 400px">
      <st-data-grid
        label="Guests"
        rowKey="id"
        [rows]="rows()"
        [columns]="columns"
        [selectable]="selectable()"
        [(selection)]="selection"
        [(sort)]="sort"
        (rowActivate)="activated.push($event)"
      >
        <ng-container *stCell="'name' of rows(); let g">{{ g.name.toUpperCase() }}</ng-container>
        <span *stHeaderCell="'table'">Tbl</span>
      </st-data-grid>
    </div>
  `,
})
class Host {
  readonly rows = signal<readonly GridRow<Guest>[]>(ROWS);
  readonly columns: GridColumn[] = [
    { key: 'name', header: 'Name', sortable: true, width: '2fr' },
    { key: 'table', header: 'Table', align: 'end' },
  ];
  readonly selectable = signal(true);
  readonly selection = signal<ReadonlySet<string>>(new Set());
  readonly sort = signal<GridSort | null>(null);
  readonly activated: Guest[] = [];
}

describe('StDataGrid', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let el: HTMLElement;

  /** The virtual viewport measures and renders across a few ticks. */
  async function settle() {
    for (let i = 0; i < 3; i++) {
      await fixture.whenStable();
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
    }
  }

  const grid = () => el.querySelector<HTMLElement>('[role="grid"]')!;
  const dataRows = () => Array.from(el.querySelectorAll<HTMLElement>('.row'));
  const rowByKey = (key: string) => el.querySelector<HTMLElement>(`[data-row-key="${key}"]`)!;
  const selected = () => [...host.selection()].sort();

  async function key(k: string, init: KeyboardEventInit = {}) {
    grid().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
    await settle();
  }

  function activeKey(): string | undefined {
    const id = grid().getAttribute('aria-activedescendant');
    return id ? el.querySelector<HTMLElement>(`#${id}`)?.dataset['rowKey'] : undefined;
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
    await settle();
  });

  describe('structure and ARIA', () => {
    it('is a labelled, multi-selectable grid that counts the header row', () => {
      expect(grid().getAttribute('aria-label')).toBe('Guests');
      expect(grid().getAttribute('aria-multiselectable')).toBe('true');
      expect(grid().getAttribute('aria-rowcount')).toBe(String(ROWS.length + 1));
      expect(grid().getAttribute('aria-colcount')).toBe('3');
      expect(grid().tabIndex).toBe(0);
    });

    it('renders column headers, with aria-sort only on sortable columns', () => {
      const headers = el.querySelectorAll('[role="columnheader"]');
      expect(headers).toHaveLength(3);
      expect(headers[1]!.getAttribute('aria-sort')).toBe('none');
      expect(headers[2]!.hasAttribute('aria-sort')).toBe(false);
    });

    it('renders data rows with row indexes and selection state', () => {
      const rows = dataRows();
      expect(rows).toHaveLength(5);
      expect(rowByKey('g1').getAttribute('aria-rowindex')).toBe('3');
      expect(rowByKey('g4').getAttribute('aria-rowindex')).toBe('7');
      expect(rows.every((r) => r.getAttribute('aria-selected') === 'false')).toBe(true);
    });

    it('renders group rows as one spanning cell with label and count', () => {
      const groups = el.querySelectorAll<HTMLElement>('.group');
      expect(groups).toHaveLength(2);
      const cell = groups[0]!.querySelector('[role="gridcell"]')!;
      expect(cell.getAttribute('aria-colspan')).toBe('3');
      expect(cell.textContent).toContain('Family');
      expect(cell.textContent).toContain('3');
      expect(groups[0]!.hasAttribute('aria-selected')).toBe(false);
    });

    it('uses cell and header templates, and plain text elsewhere', () => {
      const cells = rowByKey('g2').querySelectorAll('[role="gridcell"]');
      expect(cells[1]!.textContent?.trim()).toBe('DIYA IYER');
      expect(cells[2]!.textContent?.trim()).toBe('1');
      expect(el.querySelectorAll('[role="columnheader"]')[2]!.textContent?.trim()).toBe('Tbl');
    });

    it('shows an empty row when there is nothing to show', async () => {
      host.rows.set([]);
      await settle();
      expect(dataRows()).toHaveLength(0);
      expect(el.querySelector('.empty')?.textContent).toContain('Nothing to show');
      expect(grid().getAttribute('aria-rowcount')).toBe('2');
    });

    it('drops the selection column and semantics when not selectable', async () => {
      host.selectable.set(false);
      await settle();
      expect(grid().hasAttribute('aria-multiselectable')).toBe(false);
      expect(el.querySelector('st-checkbox')).toBeNull();
      expect(rowByKey('g1').hasAttribute('aria-selected')).toBe(false);
    });
  });

  describe('sorting', () => {
    it('cycles ascending, descending, unsorted and reflects aria-sort', async () => {
      const button = el.querySelector<HTMLButtonElement>('.sort')!;
      const header = button.closest('[role="columnheader"]')!;
      expect(button.textContent?.trim()).toBe('Name');

      button.click();
      await settle();
      expect(host.sort()).toEqual({ key: 'name', dir: 'asc' });
      expect(header.getAttribute('aria-sort')).toBe('ascending');

      button.click();
      await settle();
      expect(host.sort()).toEqual({ key: 'name', dir: 'desc' });
      expect(header.getAttribute('aria-sort')).toBe('descending');

      button.click();
      await settle();
      expect(host.sort()).toBeNull();
      expect(header.getAttribute('aria-sort')).toBe('none');
    });
  });

  describe('keyboard', () => {
    beforeEach(async () => {
      grid().focus();
      await settle();
    });

    it('activates the first data row on focus, skipping group headings', () => {
      expect(activeKey()).toBe('g1');
      expect(rowByKey('g1').classList).toContain('is-active');
    });

    it('moves with arrows, Home and End, skipping group rows and clamping', async () => {
      await key('ArrowDown');
      expect(activeKey()).toBe('g2');
      await key('ArrowDown');
      await key('ArrowDown');
      expect(activeKey()).toBe('g4');
      await key('End');
      expect(activeKey()).toBe('g5');
      await key('ArrowDown');
      expect(activeKey()).toBe('g5');
      await key('Home');
      expect(activeKey()).toBe('g1');
      await key('ArrowUp');
      expect(activeKey()).toBe('g1');
    });

    it('toggles with Space, extends with Shift+arrows, selects all with Mod+A, clears with Escape', async () => {
      await key(' ');
      expect(selected()).toEqual(['g1']);
      expect(rowByKey('g1').getAttribute('aria-selected')).toBe('true');

      await key('ArrowDown', { shiftKey: true });
      await key('ArrowDown', { shiftKey: true });
      expect(selected()).toEqual(['g1', 'g2', 'g3']);

      await key('a', { ctrlKey: true });
      expect(selected()).toEqual(['g1', 'g2', 'g3', 'g4', 'g5']);

      await key('Escape');
      expect(selected()).toEqual([]);
    });

    it('emits rowActivate with the active row on Enter', async () => {
      await key('ArrowDown');
      await key('Enter');
      expect(host.activated.map((g) => g.id)).toEqual(['g2']);
    });

    it('keeps the active row by key when the rows are re-sorted', async () => {
      await key('ArrowDown');
      host.rows.set([...ROWS].reverse());
      await settle();
      expect(activeKey()).toBe('g2');
    });

    it('ignores keys aimed at header controls', async () => {
      const button = el.querySelector<HTMLButtonElement>('.sort')!;
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await settle();
      expect(activeKey()).toBe('g1');
    });
  });

  describe('pointer selection', () => {
    const clickSelect = (k: string, init: MouseEventInit = {}) =>
      rowByKey(k)
        .querySelector('.select-cell')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, ...init }));

    it('toggles a row from its selection cell without activating it', async () => {
      clickSelect('g2');
      await settle();
      expect(selected()).toEqual(['g2']);
      clickSelect('g2');
      await settle();
      expect(selected()).toEqual([]);
      expect(host.activated).toEqual([]);
    });

    it('selects a range across group headings with Shift+click', async () => {
      clickSelect('g2');
      clickSelect('g5', { shiftKey: true });
      await settle();
      expect(selected()).toEqual(['g2', 'g3', 'g4', 'g5']);
    });

    it('activates a row when its body is clicked', async () => {
      rowByKey('g3').querySelectorAll<HTMLElement>('[role="gridcell"]')[1]!.click();
      await settle();
      expect(host.activated.map((g) => g.id)).toEqual(['g3']);
    });
  });

  describe('select all', () => {
    const box = () => el.querySelector<HTMLInputElement>('st-checkbox input')!;

    it('is labelled, shows mixed for a partial selection and toggles everything', async () => {
      expect(box().getAttribute('aria-label')).toBe('Select all rows');
      host.selection.set(new Set(['g1']));
      await settle();
      expect(box().indeterminate).toBe(true);
      expect(box().checked).toBe(false);

      box().click();
      await settle();
      expect(selected()).toEqual(['g1', 'g2', 'g3', 'g4', 'g5']);
      expect(box().checked).toBe(true);
      expect(box().indeterminate).toBe(false);

      box().click();
      await settle();
      expect(selected()).toEqual([]);
    });
  });
});

describe('grid helpers', () => {
  it('nextSort cycles asc, desc, none and restarts on a new column', () => {
    expect(nextSort(null, 'a')).toEqual({ key: 'a', dir: 'asc' });
    expect(nextSort({ key: 'a', dir: 'asc' }, 'a')).toEqual({ key: 'a', dir: 'desc' });
    expect(nextSort({ key: 'a', dir: 'desc' }, 'a')).toBeNull();
    expect(nextSort({ key: 'a', dir: 'desc' }, 'b')).toEqual({ key: 'b', dir: 'asc' });
  });

  it('isGridGroupRow recognises only group rows', () => {
    expect(isGridGroupRow(gridGroup('x', 'X', 1))).toBe(true);
    expect(isGridGroupRow({ kind: 'group' })).toBe(false);
    expect(isGridGroupRow({ id: 'g1', name: 'A' })).toBe(false);
    expect(isGridGroupRow(null)).toBe(false);
  });
});
