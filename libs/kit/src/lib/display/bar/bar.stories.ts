import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { StBar } from './bar';

interface Args {
  value: number;
  max: number;
  label: string;
  tone: 'default' | 'accent' | 'ok' | 'warn' | 'danger';
}

const meta: Meta<Args> = {
  title: 'Display/Bar',
  component: StBar,
  args: { value: 8, max: 10, label: 'T3 filled', tone: 'default' },
  argTypes: { tone: { control: 'inline-radio', options: ['default', 'accent', 'ok', 'warn', 'danger'] } },
  render: (args) => ({
    props: args,
    template: `<div style="width: 240px"><st-bar [value]="value" [max]="max" [label]="label" [tone]="tone" /></div>`,
  }),
};
export default meta;

type Story = StoryObj<Args>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('progressbar', { name: 'T3 filled' })).toHaveAttribute(
      'aria-valuetext',
      '8 of 10',
    );
  },
};

export const MealTally: Story = {
  render: () => ({
    styles: [
      `.rows { display: grid; grid-template-columns: 90px 200px 40px; gap: 10px 12px; align-items: center; font-size: var(--st-fs-md); color: var(--st-text-2); }`,
      `.n { font-family: var(--st-font-mono); font-size: var(--st-fs-xs); text-align: right; color: var(--st-text); }`,
    ],
    template: `
      <div class="rows">
        <span id="veg">Veg</span><st-bar [value]="96" [max]="207" label="Veg" /><span class="n">96</span>
        <span>Non-veg</span><st-bar [value]="81" [max]="207" label="Non-veg" /><span class="n">81</span>
        <span>Jain</span><st-bar [value]="18" [max]="207" label="Jain" /><span class="n">18</span>
        <span>Over capacity</span><st-bar [value]="12" [max]="10" tone="danger" label="Over capacity" /><span class="n">12</span>
      </div>
    `,
  }),
};
