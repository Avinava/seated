import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { StButton } from '../../actions/button/button';
import { StIcon } from '../../icons/icon/icon';
import { StBulkBar } from './bulk-bar';

type Args = Pick<StBulkBar, 'count'> & { cleared: () => void; assign: () => void };

const meta: Meta<Args> = {
  title: 'Data/Bulk Bar',
  component: StBulkBar,
  decorators: [moduleMetadata({ imports: [StButton, StIcon] })],
  args: { count: 3, cleared: fn(), assign: fn() },
  argTypes: {
    count: { control: { type: 'number', min: 0 } },
    cleared: { action: 'cleared' },
    assign: { action: 'assign' },
  },
  render: (args) => ({
    props: args,
    template: `
      <st-bulk-bar [count]="count" (cleared)="cleared()">
        <button stButton variant="ghost" size="sm" (click)="assign()"><st-icon name="table" [size]="14" />Assign table</button>
        <button stButton variant="ghost" size="sm"><st-icon name="utensils" [size]="14" />Set meal</button>
        <button stButton variant="ghost" size="sm"><st-icon name="trash" [size]="14" />Remove</button>
      </st-bulk-bar>
    `,
  }),
};
export default meta;

type Story = StoryObj<Args>;

export const WithActions: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole('group', { name: 'Bulk actions' });
    await expect(bar).toHaveTextContent('3 selected');

    await userEvent.click(canvas.getByRole('button', { name: 'Assign table' }));
    await expect(args.assign).toHaveBeenCalledOnce();

    // Keyboard: actions then Clear, in reading order.
    canvas.getByRole('button', { name: 'Remove' }).focus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Clear' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.cleared).toHaveBeenCalledOnce();
  },
};

export const ManySelected: Story = {
  args: { count: 1000 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('group')).toHaveTextContent('1,000 selected');
  },
};

export const ClearOnly: Story = {
  args: { count: 1 },
  render: (args) => ({
    props: args,
    template: `<st-bulk-bar [count]="count" (cleared)="cleared()" />`,
  }),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }));
    await expect(args.cleared).toHaveBeenCalledOnce();
  },
};
