import type { Meta, StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, within } from 'storybook/test';
import { StSegmented, type SegmentedOption } from './segmented';

interface Args {
  options: SegmentedOption[];
  value: string | null;
  groupName: string;
}

const RSVP: SegmentedOption[] = [
  { value: 'all', label: 'All', count: 214 },
  { value: 'accepted', label: 'Accepted', count: 168 },
  { value: 'pending', label: 'Pending', count: 39 },
  { value: 'declined', label: 'Declined', count: 7 },
];

const meta: Meta<Args> = {
  title: 'Actions/Segmented',
  component: StSegmented,
  args: { options: RSVP, value: 'all', groupName: 'RSVP status' },
  render: (args) => ({
    props: args,
    template: `
      <div style="display: grid; gap: 12px; justify-items: start">
        <st-segmented [options]="options" [(value)]="value" [aria-label]="groupName" />
        <output class="st-mono st-muted">value: {{ value }}</output>
      </div>
    `,
  }),
};
export default meta;

type Story = StoryObj<Args>;

export const WithCounts: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole('radiogroup', { name: 'RSVP status' });
    const all = within(group).getByRole('radio', { name: /All/ });
    await userEvent.tab();
    await expect(all).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    const accepted = within(group).getByRole('radio', { name: /Accepted/ });
    await expect(accepted).toHaveFocus();
    await expect(accepted).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{End}');
    await expect(within(group).getByRole('radio', { name: /Declined/ })).toBeChecked();
    await userEvent.click(within(group).getByRole('radio', { name: /Pending/ }));
    await expect(canvas.getByText('value: pending')).toBeVisible();
  },
};

export const ViewSwitch: Story = {
  args: {
    groupName: 'View',
    value: 'plan',
    options: [
      { value: 'plan', label: 'Plan' },
      { value: 'list', label: 'List' },
    ],
  },
};
