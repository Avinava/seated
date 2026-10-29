import type { Meta, StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';
import { StInput } from './input';

const meta: Meta<StInput> = {
  title: 'Forms/Input',
  component: StInput,
  render: () => ({
    template: `<input stInput type="search" placeholder="Find a guest" aria-label="Find a guest" style="width: 280px" />`,
  }),
};
export default meta;

type Story = StoryObj<StInput>;

export const Search: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('searchbox', { name: 'Find a guest' });
    await userEvent.type(input, 'Iyer');
    await expect(input).toHaveValue('Iyer');
  },
};

export const States: Story = {
  render: () => ({
    template: `
      <div style="display: grid; gap: 12px; width: 280px">
        <input stInput aria-label="Default" placeholder="Default" />
        <input stInput aria-label="Filled" value="Shah household" />
        <input stInput aria-label="Invalid" value="aarav@" [invalid]="true" />
        <input stInput aria-label="Disabled" value="Locked" disabled />
        <select stInput aria-label="Meal"><option>Veg</option><option>Jain</option></select>
        <textarea stInput aria-label="Notes" placeholder="Notes"></textarea>
      </div>
    `,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Invalid' })).toBeInvalid();
    await expect(canvas.getByRole('combobox', { name: 'Meal' })).toHaveValue('Veg');
  },
};
