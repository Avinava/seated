import type { Meta, StoryObj } from '@storybook/angular-vite';
import { expect, within } from 'storybook/test';
import { StIcon } from './icon';
import { ICON_NAMES } from './icons';

const meta: Meta<StIcon> = {
  title: 'Foundations/Icon',
  component: StIcon,
  args: { name: 'sparkles', size: 24 },
  argTypes: {
    name: { control: 'select', options: ICON_NAMES },
    size: { control: { type: 'range', min: 12, max: 48, step: 2 } },
  },
};
export default meta;

type Story = StoryObj<StIcon>;

export const Single: Story = {};

export const Labelled: Story = {
  args: { name: 'alert', label: 'Conflict', size: 20 },
  play: async ({ canvasElement }) => {
    const img = within(canvasElement).getByRole('img', { name: 'Conflict' });
    await expect(img).toBeVisible();
  },
};

export const Gallery: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { names: ICON_NAMES },
    styles: [
      `.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; }`,
      `figure { display: grid; justify-items: center; gap: 8px; padding: 14px 6px; border-radius: var(--st-radius-lg); background: var(--st-surface); border: 1px solid var(--st-line); color: var(--st-text); }`,
      `figcaption { font-family: var(--st-font-mono); font-size: var(--st-fs-2xs); letter-spacing: var(--st-tracking-mono); color: var(--st-text-3); text-transform: uppercase; }`,
    ],
    template: `
      <div class="grid">
        @for (n of names; track n) {
          <figure><st-icon [name]="n" [size]="22" /><figcaption>{{ n }}</figcaption></figure>
        }
      </div>
    `,
  }),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('st-icon')).toHaveLength(ICON_NAMES.length);
  },
};
