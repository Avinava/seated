import type { Meta, StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';
import { StChip } from './chip';

interface Args {
  label: string;
  removable: boolean;
  removed: () => void;
}

const meta: Meta<Args> = {
  title: 'Display/Chip',
  component: StChip,
  args: { label: 'vip', removable: true, removed: fn() },
  argTypes: { removed: { action: 'removed' } },
  render: (args) => ({
    props: args,
    template: `<st-chip [label]="label" [removable]="removable" (removed)="removed()" />`,
  }),
};
export default meta;

type Story = StoryObj<Args>;

export const Removable: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Remove vip' }));
    await expect(args.removed).toHaveBeenCalledOnce();
  },
};

export const Static: Story = { args: { removable: false, label: 'host' } };

export const TagList: Story = {
  render: () => ({
    props: {
      tags: ['vip', 'kids table', 'needs ride', 'speech'],
      remove(this: { tags: string[] }, t: string) {
        this.tags = this.tags.filter((x) => x !== t);
      },
    },
    template: `
      <div role="list" aria-label="Tags" style="display: flex; flex-wrap: wrap; gap: 6px; max-width: 360px">
        @for (t of tags; track t) {
          <st-chip role="listitem" [label]="t" (removed)="remove(t)" />
        }
      </div>
    `,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const remove = canvas.getByRole('button', { name: 'Remove kids table' });
    remove.focus();
    await userEvent.keyboard('{Backspace}');
    await expect(canvas.queryByText('kids table')).toBeNull();
    await expect(canvas.getAllByRole('listitem')).toHaveLength(3);
  },
};
