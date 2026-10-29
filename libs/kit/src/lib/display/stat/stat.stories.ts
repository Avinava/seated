import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { StStat } from './stat';

const meta: Meta<StStat> = {
  title: 'Display/Stat',
  component: StStat,
  args: { label: 'Seated', value: 168, caption: 'of 207 attending' },
};
export default meta;

type Story = StoryObj<StStat>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Seated').tagName).toBe('DT');
    await expect(canvas.getByText('168').tagName).toBe('DD');
  },
};

export const Row: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    template: `
      <div style="display: flex; gap: 40px">
        <st-stat label="Invited" value="214" />
        <st-stat label="Attending" value="207" caption="7 declined" />
        <st-stat label="Seated" value="168" caption="39 to place" />
        <st-stat label="Tables" value="21" caption="210 seats" />
      </div>
    `,
  }),
};
