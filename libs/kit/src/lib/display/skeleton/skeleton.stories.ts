import type { Meta, StoryObj } from '@storybook/angular-vite';
import { expect } from 'storybook/test';
import { StSkeleton } from './skeleton';

const meta: Meta<StSkeleton> = {
  title: 'Display/Skeleton',
  component: StSkeleton,
  args: { shape: 'line', width: '240px' },
  argTypes: { shape: { control: 'inline-radio', options: ['line', 'block', 'circle'] } },
};
export default meta;

type Story = StoryObj<StSkeleton>;

export const Line: Story = {};
export const Block: Story = { args: { shape: 'block', width: '320px' } };
export const Circle: Story = { args: { shape: 'circle', width: undefined } };

export const GuestRowsLoading: Story = {
  render: () => ({
    template: `
      <div aria-busy="true" aria-label="Loading guests" role="status" style="display: grid; gap: 14px; width: 420px">
        @for (i of [1, 2, 3, 4]; track i) {
          <div style="display: flex; gap: 12px; align-items: center">
            <st-skeleton shape="circle" />
            <div style="display: grid; gap: 6px; flex: 1">
              <st-skeleton [width]="i % 2 ? '55%' : '70%'" />
              <st-skeleton width="35%" height="10px" />
            </div>
          </div>
        }
      </div>
    `,
  }),
  play: async ({ canvasElement }) => {
    for (const bone of Array.from(canvasElement.querySelectorAll('st-skeleton'))) {
      await expect(bone).toHaveAttribute('aria-hidden', 'true');
    }
  },
};
