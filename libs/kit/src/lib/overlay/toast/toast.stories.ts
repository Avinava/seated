import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, inject, input, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { StButton } from '../../actions/button/button';
import { StToastHost } from './toast-host';
import { ToastService, type ToastOptions } from './toast.service';

/** Story harness: a toast host plus buttons that raise toasts through the service. */
@Component({
  selector: 'st-toast-demo',
  imports: [StButton, StToastHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display: flex; gap: 8px; flex-wrap: wrap">
      <button stButton (click)="remove()">Remove guest</button>
      <button stButton (click)="fail()">Trigger error</button>
    </div>
    <p style="margin-top: 16px; color: var(--st-text-2)" data-testid="state">{{ state() }}</p>
    <st-toast-host />
  `,
})
class ToastDemo {
  private readonly toasts = inject(ToastService);
  /** A toast to show immediately, held long enough to inspect. */
  readonly initial = input<ToastOptions>();
  protected readonly state = signal('Meera Iyer is on the guest list.');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.toasts.clear());
    afterNextRender(() => {
      const initial = this.initial();
      if (initial) this.toasts.show({ duration: 600_000, ...initial });
    });
  }

  protected remove(): void {
    this.state.set('Meera Iyer was removed.');
    this.toasts.show({
      message: 'Removed Meera Iyer',
      action: { label: 'Undo', run: () => this.state.set('Meera Iyer is back on the guest list.') },
    });
  }

  protected fail(): void {
    this.toasts.show({ message: 'Could not save. Check your storage space.', tone: 'danger' });
  }
}

const meta: Meta<ToastDemo> = {
  title: 'Overlay/Toast',
  component: ToastDemo,
  decorators: [moduleMetadata({ imports: [ToastDemo] })],
  parameters: { layout: 'fullscreen' },
  render: (args) => ({
    props: args,
    template: `<div style="min-height: 100vh; padding: 24px"><st-toast-demo [initial]="initial" /></div>`,
  }),
};
export default meta;

type Story = StoryObj<ToastDemo>;

/** Remove a guest, then Undo from the toast before it times out. */
export const UndoFlow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Remove guest' }));

    const status = canvas.getByRole('status');
    await waitFor(() => expect(status).toHaveTextContent('Removed Meera Iyer'));

    await userEvent.click(within(status).getByRole('button', { name: 'Undo' }));
    await expect(canvas.getByTestId('state')).toHaveTextContent('Meera Iyer is back on the guest list.');
    await waitFor(() => expect(within(status).queryByRole('button', { name: 'Undo' })).toBeNull());
  },
};

export const Neutral: Story = {
  args: { initial: { message: 'Seated 24 guests across 4 tables', action: { label: 'Undo', run: () => undefined } } },
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status');
    await waitFor(() => expect(status).toHaveTextContent('Seated 24 guests'));
  },
};

export const Danger: Story = {
  args: { initial: { message: 'Could not save. Check your storage space.', tone: 'danger' } },
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status');
    await waitFor(() => expect(status).toHaveTextContent('Could not save'));
    // The toast springs in from transparent; wait for it to land.
    await waitFor(() => expect(within(status).getByRole('button', { name: 'Dismiss' })).toBeVisible());
  },
};
