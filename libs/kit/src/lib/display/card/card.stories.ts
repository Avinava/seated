import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';
import { StProgressRing } from '../progress-ring/progress-ring';
import { StCard } from './card';

const meta: Meta<StCard> = {
  title: 'Display/Card',
  component: StCard,
  decorators: [moduleMetadata({ imports: [StProgressRing] })],
  args: { interactive: false, padding: 'md' },
  argTypes: { padding: { control: 'inline-radio', options: ['none', 'sm', 'md', 'lg'] } },
  render: (args) => ({
    props: args,
    styles: [
      `h3 { font-family: var(--st-font-display); font-weight: 600; font-size: var(--st-fs-xl); letter-spacing: var(--st-tracking-display); }`,
      `p { color: var(--st-text-2); margin-top: 4px; }`,
      `a { color: inherit; text-decoration: none; }`,
      `a::after { content: ''; position: absolute; inset: 0; border-radius: inherit; }`,
      `.row { display: flex; gap: 16px; align-items: center; justify-content: space-between; }`,
      `.meta { font-family: var(--st-font-mono); font-size: var(--st-fs-2xs); letter-spacing: var(--st-tracking-mono); text-transform: uppercase; color: var(--st-text-3); }`,
    ],
    template: `
      <st-card [interactive]="interactive" [padding]="padding" style="width: 340px">
        <div class="row">
          <div>
            <h3><a href="#event">Mehta x Iyer wedding</a></h3>
            <p>Taj Lands End, Mumbai</p>
            <span class="meta">18 Dec 2026 · 207 guests</span>
          </div>
          <st-progress-ring [value]="168" [max]="207" label="Guests seated" />
        </div>
      </st-card>
    `,
  }),
};
export default meta;

type Story = StoryObj<StCard>;

export const Static: Story = {};

export const Interactive: Story = {
  args: { interactive: true },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: 'Mehta x Iyer wedding' });
    await userEvent.tab();
    await expect(link).toHaveFocus();
    await expect(canvasElement.querySelector('st-card')).toHaveClass('is-interactive');
  },
};
