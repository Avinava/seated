import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { StButton } from '../../actions/button/button';
import { StDialog } from './dialog';

type Args = StDialog & { onConfirm: () => void; body: string };

const meta: Meta<Args> = {
  title: 'Overlay/Dialog',
  component: StDialog,
  decorators: [moduleMetadata({ imports: [StButton] })],
  parameters: { layout: 'fullscreen' },
  args: {
    heading: 'Delete table T3?',
    body: 'Six guests will move back to the unseated list. You can undo this.',
    dialogRole: 'alertdialog',
    hideClose: true,
    onConfirm: fn(),
  },
  argTypes: {
    dialogRole: { control: 'inline-radio', options: ['dialog', 'alertdialog'] },
    onConfirm: { action: 'confirm' },
  },
  render: (args) => ({
    props: { ...args, open: signal(args.open ?? false) },
    template: `
      <div style="min-height: 100vh; padding: 24px">
        <button stButton variant="danger" (click)="open.set(true)">Delete table</button>
      </div>
      <st-dialog [(open)]="open" [heading]="heading" [description]="description" [dialogRole]="dialogRole" [hideClose]="hideClose">
        {{ body }}
        <ng-container stDialogFooter>
          <button stButton (click)="open.set(false)">Cancel</button>
          <button stButton variant="danger" (click)="onConfirm(); open.set(false)">Delete</button>
        </ng-container>
      </st-dialog>
    `,
  }),
};
export default meta;

type Story = StoryObj<Args>;

/** A destructive confirmation: Tab reaches both choices, and the scrim does not dismiss it. */
export const Confirm: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const opener = canvas.getByRole('button', { name: 'Delete table' });
    await userEvent.click(opener);

    const dialog = await canvas.findByRole('alertdialog', { name: 'Delete table T3?' });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    await userEvent.click(canvasElement.querySelector<HTMLElement>('.scrim')!, { pointerEventsCheck: 0 });
    // The panel scales in from transparent, so wait for it to settle.
    await waitFor(() => expect(canvas.getByRole('alertdialog')).toBeVisible());

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await expect(args.onConfirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('alertdialog')).toBeNull());
    await expect(opener).toHaveFocus();
  },
};

export const Open: Story = { args: { open: true } };

export const Informational: Story = {
  args: {
    open: true,
    dialogRole: 'dialog',
    hideClose: false,
    heading: 'Share read-only link',
    description: 'Anyone with the link can view the plan.',
    body: 'Links include the floor plan and table lists, never guest emails or notes.',
  },
};
