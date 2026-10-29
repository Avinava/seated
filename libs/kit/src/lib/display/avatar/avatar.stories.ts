import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { StAvatar } from './avatar';

interface Args {
  initials: string;
  tone: 'neutral' | 1 | 2 | 3 | 4;
  size: 'sm' | 'md' | 'lg';
  label?: string;
}

const meta: Meta<Args> = {
  title: 'Display/Avatar',
  component: StAvatar,
  args: { initials: 'AS', tone: 1, size: 'md', label: 'Aarav Shah' },
  argTypes: {
    tone: { control: 'select', options: ['neutral', 1, 2, 3, 4] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  render: (args) => ({
    props: args,
    template: `<st-avatar [initials]="initials" [tone]="tone" [size]="size" [label]="label" />`,
  }),
};
export default meta;

type Story = StoryObj<Args>;

export const Labelled: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img', { name: 'Aarav Shah' })).toHaveTextContent('AS');
  },
};

export const ToneAndSize: Story = {
  render: () => ({
    template: `
      <div style="display: grid; gap: 12px">
        @for (size of ['sm', 'md', 'lg']; track size) {
          <div style="display: flex; gap: 8px; align-items: center">
            <st-avatar initials="AS" tone="1" [size]="$any(size)" />
            <st-avatar initials="MK" tone="2" [size]="$any(size)" />
            <st-avatar initials="RI" tone="3" [size]="$any(size)" />
            <st-avatar initials="PD" tone="4" [size]="$any(size)" />
            <st-avatar initials="+1" [size]="$any(size)" />
          </div>
        }
      </div>
    `,
  }),
};
