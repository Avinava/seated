import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { type TableShape, type Tone } from '@seated/domain';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { StIconButton } from '../../actions/icon-button/icon-button';
import { StFloorZone } from '../floor-zone/floor-zone';
import { type SeatView } from '../seat/seat';
import { StTable } from '../table/table';
import { StFloor } from './floor';

interface DemoGuest {
  readonly name: string;
  readonly tone: Tone;
}

interface DemoTable {
  readonly id: string;
  readonly label: string;
  readonly shape: TableShape;
  readonly rotation: 0 | 90;
  readonly x: number;
  readonly y: number;
  readonly guests: readonly (DemoGuest | null)[];
}

interface SeatRef {
  readonly table: string;
  readonly index: number;
}

const G = (name: string, tone: Tone): DemoGuest => ({ name, tone });

const TABLES: DemoTable[] = [
  {
    id: 'head',
    label: 'Head',
    shape: 'head',
    rotation: 0,
    x: 450,
    y: 150,
    guests: [null, G('Kabir Mehta', 1), G('Ananya Rao', 2), null, null, G('Meera Kapoor', 2), G('Aarav Shah', 1), null],
  },
  {
    id: 't1',
    label: 'T1',
    shape: 'round',
    rotation: 0,
    x: 200,
    y: 360,
    guests: [G('Priya Das', 3), G('Rohan Iyer', 3), null, G('Vikram Nair', 4), null, null, null, null, null, null],
  },
  {
    id: 't2',
    label: 'T2',
    shape: 'round',
    rotation: 0,
    x: 450,
    y: 380,
    guests: [G('Ishaan Bose', 4), null, null, null, null, null, null, null, null, null],
  },
  {
    id: 't3',
    label: 'T3',
    shape: 'long',
    rotation: 0,
    x: 720,
    y: 380,
    guests: [G('Diya Sen', 2), G('Arjun Pillai', 1), null, null, null, null, null, null, null, null, null, null],
  },
];

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('');
}

/**
 * A working plan: Enter or click a guest to pick them up, then an empty seat
 * (or another guest, to swap) to place them. The seat pops and glows, and a
 * polite live region says what happened.
 */
@Component({
  selector: 'st-floor-demo',
  imports: [StFloor, StFloorZone, StTable, StIconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar">
      <button stIconButton icon="zoom-out" aria-label="Zoom out" variant="secondary" (click)="zoomBy(-0.1)"></button>
      <span class="zoom" aria-live="polite">{{ zoomText() }}</span>
      <button stIconButton icon="zoom-in" aria-label="Zoom in" variant="secondary" (click)="zoomBy(0.1)"></button>
      <button stIconButton icon="maximize" aria-label="Reset zoom" variant="secondary" (click)="zoom.set(1)"></button>
      <p class="status" role="status">{{ status() }}</p>
    </div>
    <st-floor [width]="900" [height]="560" [zoom]="zoom()" aria-label="Floor plan">
      <st-floor-zone kind="stage" label="Stage" [x]="300" [y]="24" [w]="300" [h]="64" />
      <st-floor-zone kind="dance-floor" label="Dance floor" [x]="330" [y]="470" [w]="240" [h]="70" />
      <st-floor-zone kind="bar" label="Bar" [x]="24" [y]="120" [w]="90" [h]="120" />
      <st-floor-zone kind="exit" label="Exit" [x]="832" [y]="200" [w]="56" [h]="90" />
      <st-floor-zone kind="entrance" label="Entrance" [x]="24" [y]="500" [w]="110" [h]="44" />
      @for (t of views(); track t.id) {
        <st-table
          [shape]="t.shape"
          [rotation]="t.rotation"
          [label]="t.label"
          [seats]="t.seats"
          [x]="t.x"
          [y]="t.y"
          [selected]="selected() === t.id"
          (tableActivate)="selected.set(selected() === t.id ? null : t.id)"
          (seatActivate)="activate(t.id, $event)"
        />
      }
    </st-floor>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-rows: auto 1fr;
      height: 100vh;
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 24px;
      border-bottom: 1px solid var(--st-line);
      background: var(--st-surface);
    }
    .zoom {
      min-width: 44px;
      text-align: center;
      font-family: var(--st-font-mono);
      font-size: var(--st-fs-xs);
      color: var(--st-text-2);
    }
    .status {
      margin-left: auto;
      color: var(--st-text-2);
      font-size: var(--st-fs-md);
    }
    st-floor {
      min-height: 0;
    }
  `,
})
class FloorDemo {
  readonly tables = signal(TABLES);
  readonly picked = signal<SeatRef | null>(null);
  readonly justPlaced = signal<SeatRef | null>(null);
  readonly selected = signal<string | null>(null);
  readonly zoom = signal(1);
  readonly status = signal('Pick a guest, then a seat.');

  readonly zoomText = computed(() => `${Math.round(this.zoom() * 100)}%`);

  readonly views = computed(() => {
    const picked = this.picked();
    const placed = this.justPlaced();
    return this.tables().map((t) => ({
      ...t,
      seats: t.guests.map((g, i): SeatView => {
        const here = (r: SeatRef | null) => r?.table === t.id && r.index === i;
        if (!g) {
          return {
            initials: '',
            tone: null,
            state: picked ? 'drop-target' : 'empty',
            label: `${t.label} seat ${i + 1}, empty`,
          };
        }
        return {
          initials: initialsOf(g.name),
          tone: g.tone,
          state: here(picked) ? 'picked' : 'filled',
          label: `${t.label} seat ${i + 1}, ${g.name}${here(picked) ? ', picked up' : ''}`,
          justPlaced: here(placed),
        };
      }),
    }));
  });

  zoomBy(delta: number): void {
    this.zoom.update((z) => Math.min(1.5, Math.max(0.5, Math.round((z + delta) * 10) / 10)));
  }

  activate(table: string, index: number): void {
    const guestAt = (r: SeatRef) => this.tables().find((t) => t.id === r.table)?.guests[r.index] ?? null;
    const picked = this.picked();
    const target = { table, index };
    if (!picked) {
      const g = guestAt(target);
      if (!g) return;
      this.picked.set(target);
      this.justPlaced.set(null);
      this.status.set(`Picked up ${g.name}. Choose a seat.`);
      return;
    }
    if (picked.table === table && picked.index === index) {
      this.picked.set(null);
      this.status.set('Put back.');
      return;
    }
    const moving = guestAt(picked)!;
    const other = guestAt(target);
    this.tables.update((all) =>
      all.map((t) => {
        if (t.id !== picked.table && t.id !== table) return t;
        const guests = [...t.guests];
        if (t.id === picked.table) guests[picked.index] = other;
        if (t.id === table) guests[index] = moving;
        return { ...t, guests };
      }),
    );
    this.picked.set(null);
    this.justPlaced.set(target);
    const label = this.tables().find((t) => t.id === table)!.label;
    this.status.set(other ? `Swapped ${moving.name} and ${other.name}.` : `${moving.name} seated at ${label}.`);
  }
}

const meta: Meta<FloorDemo> = {
  title: 'Seating/Floor',
  component: StFloor,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<FloorDemo>;

export const PickAndPlace: Story = {
  render: () => ({
    moduleMetadata: { imports: [FloorDemo] },
    template: `<st-floor-demo />`,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('region', { name: 'Floor plan' })).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'T1 seat 1, Priya Das' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('Picked up Priya Das');
    await expect(canvas.getByRole('button', { name: 'T1 seat 1, Priya Das, picked up' })).toHaveAttribute(
      'data-state',
      'picked',
    );

    // Keyboard: move within T2 and drop on an empty seat.
    const t2 = canvas.getByRole('group', { name: 'Table T2' });
    within(t2).getByRole('button', { name: 'T2 seat 1, Ishaan Bose' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(within(t2).getByRole('button', { name: 'T2 seat 2, empty' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    const placed = within(t2).getByRole('button', { name: 'T2 seat 2, Priya Das' });
    await expect(placed).toHaveClass('is-placed');
    await expect(canvas.getByRole('status')).toHaveTextContent('Priya Das seated at T2.');
    await expect(canvas.getByRole('button', { name: 'T1, 2 of 10 seated' })).toBeVisible();
  },
};

export const Zoomed: Story = {
  render: () => ({
    moduleMetadata: { imports: [FloorDemo] },
    template: `<st-floor-demo />`,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Zoom out' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Zoom out' }));
    await expect(canvas.getByText('80%')).toBeVisible();
    // The plane eases to its new scale; wait for the transition to settle.
    await waitFor(() =>
      expect(canvasElement.querySelector('.plane')).toHaveStyle({ transform: 'matrix(0.8, 0, 0, 0.8, 0, 0)' }),
    );
  },
};
