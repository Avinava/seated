import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { StButton } from '../../actions/button/button';
import { StDrawer } from './drawer';

type Args = StDrawer & { onClosed: () => void };

const STAGE = `min-height: 100vh; padding: 24px; display: grid; place-items: start;`;
const FIELD = `display: grid; gap: 6px; margin-bottom: 16px; font-size: var(--st-fs-md); color: var(--st-text-2);`;
const INPUT = `height: 34px; padding: 0 10px; border: 1px solid var(--st-line-2); border-radius: var(--st-radius-md); background: var(--st-surface); color: var(--st-text);`;

const meta: Meta<Args> = {
  title: 'Overlay/Drawer',
  component: StDrawer,
  decorators: [moduleMetadata({ imports: [StButton] })],
  parameters: { layout: 'fullscreen' },
  args: { heading: 'Aarav Shah', description: "Bride's family, party of 3", onClosed: fn() },
  argTypes: { onClosed: { action: 'closed' } },
  render: (args) => ({
    props: { ...args, open: signal(args.open ?? false) },
    template: `
      <div style="${STAGE}">
        <button stButton variant="primary" (click)="open.set(true)">Edit guest</button>
      </div>
      <st-drawer [(open)]="open" [heading]="heading" [description]="description" (closed)="onClosed()">
        <label style="${FIELD}">Name <input style="${INPUT}" value="Aarav Shah" /></label>
        <label style="${FIELD}">Email <input style="${INPUT}" type="email" value="aarav@example.com" /></label>
        <label style="${FIELD}">Dietary notes <input style="${INPUT}" value="No onion, no garlic" /></label>
        <ng-container stDrawerFooter>
          <button stButton (click)="open.set(false)">Cancel</button>
          <button stButton variant="primary" (click)="open.set(false)">Save guest</button>
        </ng-container>
      </st-drawer>
    `,
  }),
};
export default meta;

type Story = StoryObj<Args>;

/** Opens from a button; Escape closes it and focus goes back to that button. */
export const OpenAndClose: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const opener = canvas.getByRole('button', { name: 'Edit guest' });
    await userEvent.click(opener);

    const dialog = await canvas.findByRole('dialog', { name: 'Aarav Shah' });
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await expect(args.onClosed).toHaveBeenCalledOnce();
    await expect(opener).toHaveFocus();
  },
};

/** Tab cycles inside the panel and never escapes to the page behind it. */
export const FocusTrap: Story = {
  args: { open: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog');
    for (let i = 0; i < 8; i++) {
      await userEvent.tab();
      await expect(dialog.contains(document.activeElement)).toBe(true);
    }
  },
};

export const Open: Story = { args: { open: true } };

export const WithoutDescription: Story = { args: { open: true, description: undefined, heading: 'Table T3' } };
