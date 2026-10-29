import type { Meta, StoryObj } from '@storybook/angular';
import { type TableShape, type Tone } from '@seated/domain';
import { expect, fn, userEvent, within } from 'storybook/test';
import { type SeatView } from '../seat/seat';
import { StTable } from './table';

const NAMES = ['Aarav Shah', 'Meera Kapoor', 'Rohan Iyer', 'Priya Das', 'Kabir Mehta', 'Ananya Rao', 'Vikram Nair'];

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('');
}

/** Builds seat view models: the first `filled` seats get a guest, the rest are empty. */
function seatsFor(capacity: number, filled: number): SeatView[] {
  return Array.from({ length: capacity }, (_, i) => {
    if (i >= filled) return { initials: '', tone: null, state: 'empty', label: `Seat ${i + 1}, empty` };
    const name = NAMES[i % NAMES.length]!;
    return {
      initials: initialsOf(name),
      tone: ((i % 4) + 1) as Tone,
      state: 'filled',
      label: `Seat ${i + 1}, ${name}`,
    };
  });
}

interface Args {
  shape: TableShape;
  seats: SeatView[];
  label: string;
  rotation: 0 | 90;
  selected: boolean;
  conflict: boolean;
  seatActivate: (i: number) => void;
  tableActivate: () => void;
}

const meta: Meta<Args> = {
  title: 'Seating/Table',
  component: StTable,
  args: {
    shape: 'round',
    seats: seatsFor(10, 7),
    label: 'T3',
    rotation: 0,
    selected: false,
    conflict: false,
    seatActivate: fn(),
    tableActivate: fn(),
  },
  argTypes: {
    shape: { control: 'inline-radio', options: ['round', 'head', 'long'] },
    rotation: { control: 'inline-radio', options: [0, 90] },
    seatActivate: { action: 'seatActivate' },
    tableActivate: { action: 'tableActivate' },
  },
  render: (args) => ({
    props: args,
    template: `
      <st-table
        [shape]="shape"
        [seats]="seats"
        [label]="label"
        [rotation]="rotation"
        [selected]="selected"
        [conflict]="conflict"
        (seatActivate)="seatActivate($event)"
        (tableActivate)="tableActivate()"
      />
    `,
  }),
};
export default meta;

type Story = StoryObj<Args>;

export const Round: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole('group', { name: 'Table T3' });
    await expect(canvas.getByRole('button', { name: 'T3, 7 of 10 seated' })).toBeVisible();

    // Tab reaches the table top, then the single seat tab stop.
    await userEvent.tab();
    await userEvent.tab();
    const first = within(group).getByRole('button', { name: 'Seat 1, Aarav Shah' });
    await expect(first).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    await expect(within(group).getByRole('button', { name: 'Seat 2, Meera Kapoor' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    const last = within(group).getByRole('button', { name: 'Seat 10, empty' });
    await expect(last).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.seatActivate).toHaveBeenCalledWith(9);

    // Only one seat is ever in the tab order.
    const tabbable = within(group)
      .getAllByRole('button')
      .filter((b) => b.classList.contains('st-seat') && b.tabIndex === 0);
    await expect(tabbable).toHaveLength(1);
  },
};

export const Head: Story = { args: { shape: 'head', label: 'Head', seats: seatsFor(8, 8) } };
export const Long: Story = { args: { shape: 'long', label: 'T7', seats: seatsFor(12, 5) } };
export const LongRotated: Story = { args: { shape: 'long', label: 'T8', rotation: 90, seats: seatsFor(12, 9) } };

export const Selected: Story = {
  args: { selected: true },
  play: async ({ canvasElement, args }) => {
    const top = within(canvasElement).getByRole('button', { name: 'T3, 7 of 10 seated' });
    await expect(top).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(top);
    await expect(args.tableActivate).toHaveBeenCalledOnce();
  },
};

export const WithConflictAndDrag: Story = {
  args: {
    conflict: true,
    seats: seatsFor(10, 6).map((s, i): SeatView => {
      if (i === 2) return { ...s, state: 'conflict', label: `${s.label}, conflict: keep apart from Vikram Nair` };
      if (i === 4) return { ...s, state: 'picked', label: `${s.label}, picked up` };
      if (i === 7) return { ...s, state: 'drop-target', label: 'Seat 8, drop here' };
      return s;
    }),
  },
};
