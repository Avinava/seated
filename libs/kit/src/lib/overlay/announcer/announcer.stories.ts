import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { StButton } from '../../actions/button/button';
import { Announcer, type Politeness } from './announcer';

/** Story harness: buttons that speak through the Announcer service. */
@Component({
  selector: 'st-announcer-demo',
  imports: [StButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display: grid; gap: 12px; max-width: 420px">
      <p style="color: var(--st-text-2)">
        Nothing visible happens: the message goes to a hidden live region that screen readers read out.
      </p>
      <button stButton variant="primary" (click)="speak()">Seat Aarav at T3</button>
    </div>
  `,
})
class AnnouncerDemo {
  private readonly announcer = inject(Announcer);
  readonly message = input('Aarav Shah seated at T3, seat 4');
  readonly politeness = input<Politeness>('polite');

  protected speak(): void {
    void this.announcer.announce(this.message(), this.politeness());
  }
}

const meta: Meta<AnnouncerDemo> = {
  title: 'Overlay/Announcer',
  component: AnnouncerDemo,
  decorators: [moduleMetadata({ imports: [AnnouncerDemo] })],
  args: { message: 'Aarav Shah seated at T3, seat 4', politeness: 'polite' },
  argTypes: { politeness: { control: 'inline-radio', options: ['polite', 'assertive'] } },
  render: (args) => ({
    props: args,
    template: `<st-announcer-demo [message]="message" [politeness]="politeness" />`,
  }),
};
export default meta;

type Story = StoryObj<AnnouncerDemo>;

/** The message lands in the CDK live region with the requested politeness. */
export const Polite: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Seat Aarav at T3' }));
    await waitFor(() => {
      const region = document.querySelector('.cdk-live-announcer-element');
      expect(region).toHaveTextContent('Aarav Shah seated at T3, seat 4');
      expect(region).toHaveAttribute('aria-live', 'polite');
    });
  },
};

export const Assertive: Story = {
  args: { message: 'Could not save the plan', politeness: 'assertive' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Seat Aarav at T3' }));
    await waitFor(() => {
      const region = document.querySelector('.cdk-live-announcer-element');
      expect(region).toHaveTextContent('Could not save the plan');
      expect(region).toHaveAttribute('aria-live', 'assertive');
    });
  },
};
