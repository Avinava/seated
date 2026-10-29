import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';
import { StButton } from '../../actions/button/button';
import { StProgressRing } from './progress-ring';

interface Args {
  value: number;
  max: number;
  label: string;
  showValue: boolean;
}

const meta: Meta<Args> = {
  title: 'Display/Progress ring',
  component: StProgressRing,
  decorators: [moduleMetadata({ imports: [StButton] })],
  args: { value: 168, max: 207, label: 'Guests seated', showValue: true },
  argTypes: { value: { control: { type: 'range', min: 0, max: 207 } } },
  render: (args) => ({
    props: args,
    template: `<st-progress-ring [value]="value" [max]="max" [label]="label" [showValue]="showValue" />`,
  }),
};
export default meta;

type Story = StoryObj<Args>;

export const Partial: Story = {
  play: async ({ canvasElement }) => {
    const ring = within(canvasElement).getByRole('progressbar', { name: 'Guests seated' });
    await expect(ring).toHaveAttribute('aria-valuenow', '168');
    await expect(ring).toHaveAttribute('aria-valuetext', '168 of 207');
  },
};

export const Empty: Story = { args: { value: 0 } };
export const Complete: Story = { args: { value: 207 } };

export const Animated: Story = {
  render: (args) => ({
    props: { ...args, value: 40 },
    template: `
      <div style="display: flex; gap: 12px; align-items: center">
        <st-progress-ring [value]="value" [max]="max" [label]="label" />
        <button stButton (click)="value = value + 40 > max ? 0 : value + 40">Seat 40 more</button>
      </div>
    `,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Seat 40 more' }));
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80');
  },
};
