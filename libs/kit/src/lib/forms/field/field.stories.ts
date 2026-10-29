import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, within } from 'storybook/test';
import { StInput } from '../input/input';
import { StField } from './field';

interface Args {
  label: string;
  hint: string;
  error: string;
  required: boolean;
}

const meta: Meta<Args> = {
  title: 'Forms/Field',
  component: StField,
  decorators: [moduleMetadata({ imports: [StInput] })],
  args: { label: 'Email', hint: 'We send the RSVP link here.', error: '', required: true },
  render: (args) => ({
    props: args,
    template: `
      <div style="width: 320px">
        <st-field [label]="label" [hint]="hint" [error]="error" [required]="required">
          <input stInput type="email" placeholder="name@example.com" />
        </st-field>
      </div>
    `,
  }),
};
export default meta;

type Story = StoryObj<Args>;

export const WithHint: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox', { name: /Email/ });
    await expect(input).toHaveAccessibleDescription('We send the RSVP link here.');
    await expect(input).toBeRequired();
    await userEvent.type(input, 'aarav@example.com');
    await expect(input).toHaveValue('aarav@example.com');
  },
};

export const WithError: Story = {
  args: { error: 'Enter an email like name@example.com' },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox', { name: /Email/ });
    await expect(input).toBeInvalid();
    await expect(input).toHaveAccessibleDescription('We send the RSVP link here. Enter an email like name@example.com');
  },
};

/** Validates on blur, the way the app's guest form does. */
@Component({
  selector: 'st-field-blur-demo',
  imports: [StField, StInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="width: 320px">
      <st-field label="Email" [error]="error()" required>
        <input stInput type="email" (blur)="check($event)" />
      </st-field>
    </div>
  `,
})
class FieldBlurDemo {
  protected readonly error = signal('');
  // A template ref on the input would resolve to the StInput component, so read the event target.
  protected check(event: FocusEvent): void {
    const value = (event.target as HTMLInputElement).value;
    this.error.set(/^\S+@\S+\.\S+$/.test(value) ? '' : 'Enter an email like name@example.com');
  }
}

export const ValidateOnBlur: Story = {
  render: () => ({
    moduleMetadata: { imports: [FieldBlurDemo] },
    template: `<st-field-blur-demo />`,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: /Email/ });
    await userEvent.type(input, 'aarav');
    await userEvent.tab();
    await expect(input).toBeInvalid();
    await expect(canvas.getByText('Enter an email like name@example.com')).toBeVisible();
    await userEvent.clear(input);
    await userEvent.type(input, 'aarav@example.com');
    await userEvent.tab();
    await expect(input).toBeValid();
  },
};

export const Controls: Story = {
  render: () => ({
    template: `
      <div style="display: grid; gap: 16px; width: 320px">
        <st-field label="Name" required><input stInput value="Aarav Shah" /></st-field>
        <st-field label="Meal" hint="Shown to the caterer">
          <select stInput>
            <option>Veg</option><option>Non-veg</option><option>Jain</option><option>Vegan</option>
          </select>
        </st-field>
        <st-field label="Notes"><textarea stInput placeholder="Allergies, access needs"></textarea></st-field>
        <st-field label="Party"><input stInput value="Shah household" disabled /></st-field>
      </div>
    `,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('combobox', { name: 'Meal' })).toHaveAccessibleDescription('Shown to the caterer');
    await expect(canvas.getByRole('textbox', { name: 'Party' })).toBeDisabled();
  },
};
