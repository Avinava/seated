import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { StButton } from '../../actions/button/button';
import { StIcon } from '../../icons/icon/icon';
import { StEmptyState } from './empty-state';

const meta: Meta<StEmptyState> = {
  title: 'Display/Empty state',
  component: StEmptyState,
  decorators: [moduleMetadata({ imports: [StButton, StIcon] })],
};
export default meta;

type Story = StoryObj<StEmptyState>;

export const NoGuests: Story = {
  render: () => ({
    template: `
      <st-empty-state icon="users" heading="No guests yet">
        Import a CSV from your spreadsheet or add people one at a time.
        <div actions>
          <button stButton variant="primary"><st-icon name="plus" /> Add guest</button>
          <button stButton><st-icon name="upload" /> Import CSV</button>
        </div>
      </st-empty-state>
    `,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 2, name: 'No guests yet' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Add guest' })).toBeVisible();
  },
};

export const NoResults: Story = {
  render: () => ({
    template: `
      <st-empty-state icon="search" heading="Nobody matches 'Zed'" [level]="3">
        Check the spelling or clear the filters.
      </st-empty-state>
    `,
  }),
};
