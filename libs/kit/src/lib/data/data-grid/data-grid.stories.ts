import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { StButton } from '../../actions/button/button';
import { StIcon } from '../../icons/icon/icon';
import { StBulkBar } from '../bulk-bar/bulk-bar';
import { StDataGrid } from './data-grid';
import { StCell, StHeaderCell } from './grid-cell';
import { gridGroup, type GridColumn, type GridRow, type GridSort } from './grid-types';

// Demo data ------------------------------------------------------------------

type Rsvp = 'Accepted' | 'Pending' | 'Declined';

interface DemoGuest {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly group: string;
  readonly tone: 1 | 2 | 3 | 4;
  readonly meal: string;
  readonly rsvp: Rsvp;
  readonly table: number | null;
}

const GROUPS = [
  { id: 'bride', label: "Bride's family", tone: 1 },
  { id: 'groom', label: "Groom's family", tone: 2 },
  { id: 'friends', label: 'Friends', tone: 3 },
  { id: 'work', label: 'Work', tone: 4 },
] as const;

const FIRST = [
  'Aarav',
  'Diya',
  'Kabir',
  'Meera',
  'Rohan',
  'Ananya',
  'Vihaan',
  'Isha',
  'Arjun',
  'Saanvi',
  'Neel',
  'Tara',
];
const LAST = ['Shah', 'Iyer', 'Rao', 'Nair', 'Das', 'Mehta', 'Kapoor', 'Menon', 'Bose', 'Pillai', 'Joshi', 'Sen'];
const MEALS = ['Veg', 'Non-veg', 'Jain', 'Vegan'];
const RSVPS: readonly Rsvp[] = ['Accepted', 'Accepted', 'Accepted', 'Pending', 'Declined'];

/** Deterministic guests, so interaction tests and screenshots are stable. */
function makeGuests(count: number): DemoGuest[] {
  return Array.from({ length: count }, (_, i) => {
    const first = FIRST[i % FIRST.length]!;
    const last = LAST[Math.floor(i / FIRST.length) % LAST.length]!;
    const group = GROUPS[(i * 7) % GROUPS.length]!;
    const rsvp = RSVPS[(i * 3) % RSVPS.length]!;
    return {
      id: `g${String(i + 1).padStart(4, '0')}`,
      name: `${first} ${last}${i >= FIRST.length * LAST.length ? ` ${Math.floor(i / (FIRST.length * LAST.length)) + 1}` : ''}`,
      initials: `${first[0]}${last[0]}`,
      group: group.label,
      tone: group.tone,
      meal: MEALS[(i * 5) % MEALS.length]!,
      rsvp,
      table: rsvp === 'Declined' || i % 6 === 0 ? null : (i % 40) + 1,
    };
  });
}

function compare(a: DemoGuest, b: DemoGuest, sort: GridSort): number {
  const dir = sort.dir === 'asc' ? 1 : -1;
  if (sort.key === 'table') return ((a.table ?? Infinity) - (b.table ?? Infinity)) * dir;
  const key = sort.key as keyof DemoGuest;
  return String(a[key]).localeCompare(String(b[key])) * dir;
}

// Demo host: owns sorting, grouping, selection and the bulk bar --------------

@Component({
  selector: 'st-guest-grid-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StDataGrid, StCell, StHeaderCell, StBulkBar, StButton, StIcon],
  template: `
    <div class="frame">
      <st-data-grid
        label="Guests"
        rowKey="id"
        emptyText="No guests match"
        [rows]="rows()"
        [columns]="columns"
        [selectable]="selectable()"
        [(selection)]="selection"
        [(sort)]="sort"
        (rowActivate)="opened.set($event.name)"
      >
        <ng-container *stCell="'name' of rows(); let g">
          <span class="who">
            <span class="initials" [attr.data-tone]="g.tone" aria-hidden="true">{{ g.initials }}</span>
            {{ g.name }}
          </span>
        </ng-container>
        <ng-container *stCell="'group' of rows(); let g">
          <span class="pill" [attr.data-tone]="g.tone"><span class="dot"></span>{{ g.group }}</span>
        </ng-container>
        <ng-container *stCell="'rsvp' of rows(); let g">
          <span class="pill" [attr.data-rsvp]="g.rsvp">{{ g.rsvp }}</span>
        </ng-container>
        <ng-container *stCell="'table' of rows(); let g">
          <span class="num">{{ g.table === null ? 'None' : 'T' + g.table }}</span>
        </ng-container>
        <span *stHeaderCell="'meal'" class="with-icon"><st-icon name="utensils" [size]="12" />Meal</span>
      </st-data-grid>

      @if (selection().size > 0) {
        <st-bulk-bar class="bulk" [count]="selection().size" (cleared)="selection.set(empty)">
          <button stButton variant="ghost" size="sm"><st-icon name="table" [size]="14" />Assign table</button>
          <button stButton variant="ghost" size="sm"><st-icon name="tag" [size]="14" />Tag</button>
        </st-bulk-bar>
      }
    </div>
    <p class="status" role="status">{{ opened() ? 'Opened ' + opened() : 'Click a row or press Enter to open it' }}</p>
  `,
  styles: `
    :host {
      display: block;
      width: min(920px, 100%);
    }
    .frame {
      position: relative;
      height: 520px;
    }
    .bulk {
      position: absolute;
      left: 50%;
      bottom: var(--st-space-4);
      transform: translateX(-50%);
      z-index: 2;
    }
    .status {
      margin-top: var(--st-space-3);
      color: var(--st-text-2);
      font-size: var(--st-fs-sm);
    }
    .who {
      display: inline-flex;
      align-items: center;
      gap: var(--st-space-2);
      font-weight: 500;
    }
    .initials {
      display: inline-grid;
      place-items: center;
      width: 24px;
      height: 24px;
      border: 1px solid var(--tone);
      border-radius: var(--st-radius-pill);
      background: var(--tone-soft);
      font-family: var(--st-font-mono);
      font-size: var(--st-fs-2xs);
      letter-spacing: 0.02em;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 22px;
      padding: 0 var(--st-space-2);
      border-radius: var(--st-radius-pill);
      background: var(--tone-soft, var(--st-surface-2));
      color: var(--st-text);
      font-size: var(--st-fs-sm);
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--tone);
    }
    [data-tone='1'] {
      --tone: var(--st-cat-1);
      --tone-soft: var(--st-cat-1-soft);
    }
    [data-tone='2'] {
      --tone: var(--st-cat-2);
      --tone-soft: var(--st-cat-2-soft);
    }
    [data-tone='3'] {
      --tone: var(--st-cat-3);
      --tone-soft: var(--st-cat-3-soft);
    }
    [data-tone='4'] {
      --tone: var(--st-cat-4);
      --tone-soft: var(--st-cat-4-soft);
    }
    [data-rsvp='Accepted'] {
      --tone-soft: var(--st-ok-soft);
    }
    [data-rsvp='Pending'] {
      --tone-soft: var(--st-warn-soft);
    }
    [data-rsvp='Declined'] {
      --tone-soft: var(--st-danger-soft);
    }
    .num {
      font-family: var(--st-font-mono);
      font-size: var(--st-fs-xs);
      letter-spacing: var(--st-tracking-mono);
    }
    .with-icon {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
  `,
})
class GuestGridDemo {
  readonly count = input(1000, { transform: numberAttribute });
  readonly grouped = input(true, { transform: booleanAttribute });
  readonly selectable = input(true, { transform: booleanAttribute });

  protected readonly empty: ReadonlySet<string> = new Set();
  protected readonly columns: GridColumn[] = [
    { key: 'name', header: 'Name', sortable: true, width: 'minmax(180px, 2fr)' },
    { key: 'group', header: 'Group', sortable: true, width: 'minmax(150px, 1.4fr)' },
    { key: 'meal', header: 'Meal', width: 'minmax(90px, 1fr)' },
    { key: 'rsvp', header: 'RSVP', sortable: true, width: 'minmax(100px, 1fr)' },
    { key: 'table', header: 'Table', sortable: true, width: '96px', align: 'end' },
  ];

  protected readonly selection = signal<ReadonlySet<string>>(new Set());
  protected readonly sort = signal<GridSort | null>(null);
  protected readonly opened = signal('');

  private readonly guests = computed(() => makeGuests(this.count()));

  protected readonly rows = computed<readonly GridRow<DemoGuest>[]>(() => {
    const sort = this.sort();
    const sorted = sort ? [...this.guests()].sort((a, b) => compare(a, b, sort)) : this.guests();
    if (!this.grouped()) return sorted;
    return GROUPS.flatMap((g) => {
      const members = sorted.filter((x) => x.group === g.label);
      return members.length ? [gridGroup(g.id, g.label, members.length), ...members] : [];
    });
  });
}

// Stories ------------------------------------------------------------------------

interface DemoArgs {
  count: number;
  grouped: boolean;
  selectable: boolean;
}

const meta: Meta<DemoArgs> = {
  title: 'Data/Data Grid',
  component: StDataGrid,
  decorators: [moduleMetadata({ imports: [GuestGridDemo] })],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Virtualised grid with one tab stop. Arrows, Home/End and PageUp/PageDown move the active row; Space selects, Shift+arrows extend, Mod+A selects all, Escape clears, Enter opens. Sorting is controlled by the owner; rows may include group headings.',
      },
    },
  },
  args: { count: 1000, grouped: true, selectable: true },
  argTypes: {
    count: { control: { type: 'number', min: 0, max: 5000, step: 100 } },
    grouped: { control: 'boolean' },
    selectable: { control: 'boolean' },
  },
  render: (args) => ({
    props: args,
    template: `<st-guest-grid-demo [count]="count" [grouped]="grouped" [selectable]="selectable" />`,
  }),
};
export default meta;

type Story = StoryObj<DemoArgs>;

const activeRow = (grid: HTMLElement) => {
  const id = grid.getAttribute('aria-activedescendant');
  return id ? grid.querySelector<HTMLElement>(`#${id}`) : null;
};

export const ThousandGuests: Story = {
  name: '1,000 guests, grouped',
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const grid = await canvas.findByRole('grid', { name: 'Guests' });

    await step('virtualises: 1,005 logical rows, a handful rendered', async () => {
      await expect(grid).toHaveAttribute('aria-rowcount', String(1000 + GROUPS.length + 1));
      await waitFor(() => expect(grid.querySelectorAll('.row').length).toBeGreaterThan(5));
      await expect(grid.querySelectorAll('[role="row"]').length).toBeLessThan(80);
    });

    await step('click opens a row and focuses the grid', async () => {
      const first = grid.querySelectorAll<HTMLElement>('.row [role="gridcell"]')[1]!;
      await userEvent.click(first);
      await expect(grid).toHaveFocus();
      await expect(canvas.getByRole('status')).toHaveTextContent(/^Opened /);
    });

    await step('keyboard selection drives the bulk bar', async () => {
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard(' ');
      await userEvent.keyboard('{Shift>}{ArrowDown}{ArrowDown}{/Shift}');
      const bar = await canvas.findByRole('group', { name: 'Bulk actions' });
      await expect(bar).toHaveTextContent('3 selected');
      await expect(grid.querySelectorAll('[aria-selected="true"]')).toHaveLength(3);
    });

    await step('End jumps to the last guest and keeps it in view', async () => {
      await userEvent.keyboard('{End}');
      await waitFor(() => expect(activeRow(grid)).not.toBeNull());
      await expect(activeRow(grid)).toHaveAttribute('aria-rowindex', String(1000 + GROUPS.length + 1));
    });

    await step('Clear empties the selection', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Clear' }));
      await expect(canvas.queryByRole('group', { name: 'Bulk actions' })).toBeNull();
    });
  },
};

export const SortAndSelectAll: Story = {
  args: { count: 40, grouped: false },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const grid = await canvas.findByRole('grid', { name: 'Guests' });
    const nameHeader = canvas.getByRole('columnheader', { name: 'Name' });
    const firstName = () => grid.querySelector('.row [role="gridcell"]:nth-child(2)')?.textContent?.trim();

    await step('sort cycles ascending, descending, unsorted', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Name' }));
      await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
      await waitFor(() => expect(firstName()).toMatch(/Aarav Iyer/));
      await userEvent.click(canvas.getByRole('button', { name: 'Name' }));
      await expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
      await waitFor(() => expect(firstName()).toMatch(/Vihaan Shah/));
      await userEvent.click(canvas.getByRole('button', { name: 'Name' }));
      await expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    });

    await step('select all toggles every row, then Escape clears from the grid', async () => {
      const all = canvas.getByRole('checkbox', { name: 'Select all rows' });
      await userEvent.click(all);
      await expect(all).toBeChecked();
      await expect(await canvas.findByRole('group', { name: 'Bulk actions' })).toHaveTextContent('40 selected');
      grid.focus();
      await userEvent.keyboard('{Escape}');
      await expect(all).not.toBeChecked();
      await expect(canvas.queryByRole('group', { name: 'Bulk actions' })).toBeNull();
    });

    await step('Mod+A selects all and a partial selection reads as mixed', async () => {
      await userEvent.keyboard('{Control>}a{/Control}');
      await expect(canvas.getByRole('checkbox', { name: 'Select all rows' })).toBeChecked();
      await userEvent.keyboard(' ');
      await expect(canvas.getByRole('checkbox', { name: 'Select all rows' })).toBePartiallyChecked();
    });
  },
};

export const ReadOnly: Story = {
  args: { count: 24, grouped: true, selectable: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const grid = await canvas.findByRole('grid', { name: 'Guests' });
    await expect(grid).not.toHaveAttribute('aria-multiselectable');
    await expect(canvas.queryByRole('checkbox')).toBeNull();
    grid.focus();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(canvas.getByRole('status')).toHaveTextContent(/^Opened /);
  },
};

export const Empty: Story = {
  args: { count: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No guests match')).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: 'Select all rows' })).toBeDisabled();
  },
};
