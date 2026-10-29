import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { StButton } from '../../actions/button/button';
import { StSeat, type SeatState } from './seat';

interface Args {
  state: SeatState;
  initials: string;
  tone: 1 | 2 | 3 | 4 | null;
  justPlaced: boolean;
  label: string;
  activate: () => void;
}

const meta: Meta<Args> = {
  title: 'Seating/Seat',
  component: StSeat,
  decorators: [moduleMetadata({ imports: [StButton] })],
  args: {
    state: 'filled',
    initials: 'AS',
    tone: 1,
    justPlaced: false,
    label: 'Seat 4, Aarav Shah',
    activate: fn(),
  },
  argTypes: {
    state: { control: 'inline-radio', options: ['empty', 'filled', 'picked', 'drop-target', 'conflict'] },
    tone: { control: 'inline-radio', options: [null, 1, 2, 3, 4] },
    activate: { action: 'activate' },
  },
  render: (args) => ({
    props: args,
    template: `
      <button stSeat [state]="state" [initials]="initials" [tone]="tone" [justPlaced]="justPlaced" [label]="label" (click)="activate()"></button>
    `,
  }),
};
export default meta;

type Story = StoryObj<Args>;

export const Filled: Story = {
  play: async ({ canvasElement, args }) => {
    const seat = within(canvasElement).getByRole('button', { name: 'Seat 4, Aarav Shah' });
    await userEvent.tab();
    await expect(seat).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.activate).toHaveBeenCalledOnce();
  },
};

export const Empty: Story = { args: { state: 'empty', initials: '', tone: null, label: 'Seat 5, empty' } };
export const Picked: Story = { args: { state: 'picked', label: 'Seat 4, Aarav Shah, picked up' } };
export const DropTarget: Story = {
  args: { state: 'drop-target', initials: '', tone: null, label: 'Seat 5, drop here' },
};
export const Conflict: Story = {
  args: { state: 'conflict', tone: 3, initials: 'RI', label: 'Seat 2, Rohan Iyer, conflict: keep apart from Vikram' },
};

export const AllStates: Story = {
  render: () => ({
    styles: [
      `.grid { display: grid; grid-template-columns: repeat(5, 96px); gap: 20px 8px; text-align: center; }`,
      `figure { display: grid; justify-items: center; gap: 12px; }`,
      `figcaption { font-family: var(--st-font-mono); font-size: var(--st-fs-2xs); letter-spacing: var(--st-tracking-mono); text-transform: uppercase; color: var(--st-text-3); }`,
    ],
    template: `
      <div class="grid">
        <figure><button stSeat state="empty" label="Empty seat"></button><figcaption>Empty</figcaption></figure>
        <figure><button stSeat state="filled" initials="AS" [tone]="1" label="Filled, tone 1"></button><figcaption>Filled</figcaption></figure>
        <figure><button stSeat state="picked" initials="MK" [tone]="2" label="Picked up"></button><figcaption>Picked</figcaption></figure>
        <figure><button stSeat state="drop-target" label="Drop target"></button><figcaption>Drop target</figcaption></figure>
        <figure><button stSeat state="conflict" initials="RI" [tone]="3" label="Conflict"></button><figcaption>Conflict</figcaption></figure>
        @for (t of [1, 2, 3, 4]; track t) {
          <figure>
            <button stSeat state="filled" [initials]="'T' + t" [tone]="$any(t)" [label]="'Tone ' + t"></button>
            <figcaption>Tone {{ t }}</figcaption>
          </figure>
        }
      </div>
    `,
  }),
};

export const JustPlaced: Story = {
  render: () => ({
    props: { placed: false, state: 'empty' },
    template: `
      <div style="display: flex; gap: 24px; align-items: center">
        <button stSeat [state]="$any(state)" initials="AS" [tone]="1" [justPlaced]="placed" label="Seat 1"></button>
        <button stButton variant="primary" (click)="state = 'filled'; placed = true">Place guest</button>
        <button stButton (click)="placed = false; state = 'empty'">Reset</button>
      </div>
    `,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Place guest' }));
    const seat = canvas.getByRole('button', { name: 'Seat 1' });
    await expect(seat).toHaveAttribute('data-state', 'filled');
    await expect(seat).toHaveClass('is-placed');
  },
};
