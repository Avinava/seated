import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { StKbd } from './kbd';

const meta: Meta<StKbd> = {
  title: 'Actions/Kbd',
  component: StKbd,
  args: { keys: 'Mod+K' },
};
export default meta;

type Story = StoryObj<StKbd>;

export const Combo: Story = {};

export const Shortcuts: Story = {
  render: () => ({
    styles: [
      `dl { display: grid; grid-template-columns: auto auto; gap: 10px 24px; align-items: center; color: var(--st-text-2); font-size: var(--st-fs-md); }`,
      `dd { margin: 0; justify-self: end; }`,
    ],
    template: `
      <dl>
        <dt>Command palette</dt><dd><st-kbd keys="Mod+K" /></dd>
        <dt>Undo</dt><dd><st-kbd keys="Mod+Z" /></dd>
        <dt>Redo</dt><dd><st-kbd keys="Mod+Shift+Z" /></dd>
        <dt>Auto-seat</dt><dd><st-kbd keys="A" /></dd>
        <dt>Close</dt><dd><st-kbd>Esc</st-kbd></dd>
      </dl>
    `,
  }),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Esc')).toBeVisible();
    await expect(canvasElement.querySelectorAll('st-kbd')).toHaveLength(5);
  },
};
