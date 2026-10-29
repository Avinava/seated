import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { StFloor } from '../floor/floor';
import { StFloorZone } from './floor-zone';

const meta: Meta<StFloorZone> = {
  title: 'Seating/Floor zone',
  component: StFloorZone,
  decorators: [moduleMetadata({ imports: [StFloor] })],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<StFloorZone>;

export const Kinds: Story = {
  render: () => ({
    template: `
      <st-floor [width]="640" [height]="260" aria-label="Zone kinds" style="height: 340px">
        <st-floor-zone kind="stage" label="Stage" [x]="24" [y]="24" [w]="220" [h]="80" />
        <st-floor-zone kind="dance-floor" label="Dance floor" [x]="270" [y]="24" [w]="180" [h]="80" />
        <st-floor-zone kind="bar" label="Bar" [x]="476" [y]="24" [w]="140" [h]="80" />
        <st-floor-zone kind="exit" label="Exit" [x]="24" [y]="150" [w]="60" [h]="80" />
        <st-floor-zone kind="entrance" label="Entrance" [x]="110" [y]="170" [w]="140" [h]="44" />
      </st-floor>
    `,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const label of ['Stage', 'Dance floor', 'Bar', 'Exit', 'Entrance']) {
      await expect(canvas.getByText(label)).toBeVisible();
    }
    await expect(canvas.getByText('Exit').closest('st-floor-zone')).toHaveAttribute('data-kind', 'exit');
  },
};
