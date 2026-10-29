import type { Meta, StoryObj } from '@storybook/angular-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ICON_NAMES } from '../../icons/icon/icons';
import { StIconButton } from './icon-button';

// `ariaLabel`, not `label`: an arg named like a component field that is not an input
// (`label` is the field behind `aria-label`) is assigned over the signal.
type Args = Pick<StIconButton, 'variant' | 'size'> & { icon: string; ariaLabel: string; onClick: () => void };

const meta: Meta<Args> = {
  title: 'Actions/Icon button',
  component: StIconButton,
  args: { icon: 'undo', ariaLabel: 'Undo', variant: 'ghost', size: 'md', onClick: fn() },
  argTypes: {
    icon: { control: 'select', options: ICON_NAMES },
    variant: { control: 'inline-radio', options: ['ghost', 'secondary', 'primary'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    onClick: { action: 'click' },
  },
  render: (args) => ({
    props: args,
    template: `<button stIconButton [icon]="icon" [aria-label]="ariaLabel" [variant]="variant" [size]="size" (click)="onClick()"></button>`,
  }),
};
export default meta;

type Story = StoryObj<Args>;

export const Ghost: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Undo' });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Secondary: Story = { args: { variant: 'secondary', icon: 'more', ariaLabel: 'More actions' } };

export const Toolbar: Story = {
  render: () => ({
    props: { filters: false },
    template: `
      <div style="display: flex; gap: 4px; align-items: center">
        <button stIconButton icon="undo" aria-label="Undo"></button>
        <button stIconButton icon="redo" aria-label="Redo" disabled></button>
        <button stIconButton icon="zoom-out" aria-label="Zoom out" variant="secondary"></button>
        <button stIconButton icon="zoom-in" aria-label="Zoom in" variant="secondary"></button>
        <button stIconButton icon="maximize" aria-label="Fit to screen" variant="secondary"></button>
        <button stIconButton icon="filter" aria-label="Filters" [pressed]="filters" (click)="filters = !filters"></button>
      </div>
    `,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button', { name: 'Filters' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByRole('button', { name: 'Redo' })).toBeDisabled();
  },
};
