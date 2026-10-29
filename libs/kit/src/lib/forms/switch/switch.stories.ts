import type { Meta, StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, within } from 'storybook/test';
import { StSwitch } from './switch';

interface Args {
  checked: boolean;
  disabled: boolean;
  label: string;
}

const meta: Meta<Args> = {
  title: 'Forms/Switch',
  component: StSwitch,
  args: { checked: false, disabled: false, label: 'Show seat numbers' },
  render: (args) => ({
    props: args,
    template: `<st-switch [(checked)]="checked" [disabled]="disabled">{{ label }}</st-switch>`,
  }),
};
export default meta;

type Story = StoryObj<Args>;

export const Off: Story = {
  play: async ({ canvasElement }) => {
    const sw = within(canvasElement).getByRole('switch', { name: 'Show seat numbers' });
    await expect(sw).not.toBeChecked();
    await userEvent.click(sw);
    await expect(sw).toBeChecked();
    await userEvent.keyboard(' ');
    await expect(sw).not.toBeChecked();
    await userEvent.keyboard('{Enter}');
    await expect(sw).toBeChecked();
  },
};

export const On: Story = { args: { checked: true } };
export const Disabled: Story = { args: { disabled: true, checked: true } };
