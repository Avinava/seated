import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';
import { StIcon } from '../../icons/icon/icon';
import { StButton } from './button';

type Args = StButton & { label: string; onClick: () => void };

const meta: Meta<Args> = {
  title: 'Actions/Button',
  component: StButton,
  decorators: [moduleMetadata({ imports: [StIcon] })],
  args: { variant: 'secondary', size: 'md', label: 'Add guest', onClick: fn() },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    // The Angular renderer drops args that have neither a control nor an action.
    onClick: { action: 'click' },
  },
  render: (args) => ({
    props: args,
    template: `<button stButton [variant]="variant" [size]="size" (click)="onClick()">{{ label }}</button>`,
  }),
};
export default meta;

type Story = StoryObj<Args>;

export const Secondary: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Add guest' });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
    button.blur();
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
};

export const Primary: Story = { args: { variant: 'primary', label: 'Auto-seat' } };
export const Ghost: Story = { args: { variant: 'ghost', label: 'Cancel' } };
export const Danger: Story = { args: { variant: 'danger', label: 'Delete table' } };

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 8px; align-items: center">
        <button stButton size="sm">Small 28</button>
        <button stButton>Medium 34</button>
        <button stButton size="lg">Large 38</button>
      </div>
    `,
  }),
};

export const WithIcons: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 8px; align-items: center">
        <button stButton variant="primary"><st-icon name="sparkles" /> Auto-seat</button>
        <button stButton><st-icon name="upload" /> Import CSV</button>
        <button stButton variant="ghost"><st-icon name="printer" /> Print</button>
        <a stButton href="#share"><st-icon name="share" /> Share link</a>
      </div>
    `,
  }),
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: 'Share link' });
    await expect(link).toHaveAttribute('data-variant', 'secondary');
  },
};

export const Disabled: Story = {
  render: () => ({
    template: `<button stButton variant="primary" disabled>Saving</button>`,
  }),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Saving' })).toBeDisabled();
  },
};
