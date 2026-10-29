import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { type StTone } from '../../shared/tone';
import { StPill } from './pill';

interface Args {
  tone: StTone;
  mono: boolean;
  text: string;
}

const meta: Meta<Args> = {
  title: 'Display/Pill',
  component: StPill,
  args: { tone: 'neutral', mono: false, text: 'Pending' },
  argTypes: { tone: { control: 'select', options: ['neutral', 1, 2, 3, 4, 'ok', 'warn', 'danger'] } },
  render: (args) => ({ props: args, template: `<st-pill [tone]="tone" [mono]="mono">{{ text }}</st-pill>` }),
};
export default meta;

type Story = StoryObj<Args>;

export const Neutral: Story = {};

export const Tones: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 8px; max-width: 520px">
        <st-pill tone="1">Bride's family</st-pill>
        <st-pill tone="2">Groom's family</st-pill>
        <st-pill tone="3">College friends</st-pill>
        <st-pill tone="4">Work</st-pill>
        <st-pill tone="ok">Accepted</st-pill>
        <st-pill tone="warn">Pending</st-pill>
        <st-pill tone="danger">Declined</st-pill>
        <st-pill>Plus-one</st-pill>
        <st-pill mono>Jain</st-pill>
      </div>
    `,
  }),
  play: async ({ canvasElement }) => {
    const declined = within(canvasElement).getByText('Declined');
    await expect(declined).toHaveAttribute('data-tone', 'danger');
    await expect(declined.querySelector('.dot')).not.toBeNull();
  },
};
