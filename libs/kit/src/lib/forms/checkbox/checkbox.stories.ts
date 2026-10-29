import type { Meta, StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, within } from 'storybook/test';
import { StCheckbox } from './checkbox';

interface Args {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  label: string;
}

const meta: Meta<Args> = {
  title: 'Forms/Checkbox',
  component: StCheckbox,
  args: { checked: false, indeterminate: false, disabled: false, label: 'Needs step-free access' },
  render: (args) => ({
    props: args,
    template: `<st-checkbox [(checked)]="checked" [(indeterminate)]="indeterminate" [disabled]="disabled">{{ label }}</st-checkbox>`,
  }),
};
export default meta;

type Story = StoryObj<Args>;

export const Unchecked: Story = {
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole('checkbox', { name: 'Needs step-free access' });
    await userEvent.click(box);
    await expect(box).toBeChecked();
    await userEvent.keyboard(' ');
    await expect(box).not.toBeChecked();
  },
};

export const Checked: Story = { args: { checked: true } };

export const Indeterminate: Story = {
  args: { indeterminate: true, label: 'Select all guests' },
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole('checkbox', { name: 'Select all guests' });
    await expect(box).toBePartiallyChecked();
    await userEvent.click(box);
    await expect(box).toBeChecked();
    await expect(box).not.toBePartiallyChecked();
  },
};

export const Disabled: Story = { args: { disabled: true, checked: true } };
