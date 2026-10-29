import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { StButton } from '../../actions/button/button';
import { StKbd } from '../../actions/kbd/kbd';
import { StCommandPalette } from './command-palette';
import type { PaletteItem } from './palette-filter';

const COMMANDS: PaletteItem[] = [
  { id: 'go-guests', label: 'Go to guests', group: 'Navigate', icon: 'users', shortcut: 'G+G' },
  { id: 'go-plan', label: 'Go to floor plan', group: 'Navigate', icon: 'map-pin', shortcut: 'G+P' },
  { id: 'go-home', label: 'Go to events', group: 'Navigate', icon: 'home' },
  { id: 'auto-seat', label: 'Auto-seat guests', group: 'Actions', icon: 'sparkles', hint: 'Fill empty seats' },
  { id: 'add-guest', label: 'Add guest', group: 'Actions', icon: 'plus', shortcut: 'N' },
  { id: 'add-table', label: 'Add round table', group: 'Actions', icon: 'table' },
  { id: 'import', label: 'Import guests from CSV', group: 'Actions', icon: 'upload' },
  { id: 'print', label: 'Print place cards', group: 'Actions', icon: 'printer', keywords: 'pdf export' },
  { id: 'share', label: 'Share read-only link', group: 'Actions', icon: 'share' },
  { id: 'undo', label: 'Undo', group: 'Edit', icon: 'undo', shortcut: 'Mod+Z' },
  { id: 'redo', label: 'Redo', group: 'Edit', icon: 'redo', shortcut: 'Mod+Shift+Z' },
  { id: 'theme', label: 'Toggle dark mode', group: 'Preferences', icon: 'moon' },
  { id: 'guest-aarav', label: 'Aarav Shah', group: 'Guests', icon: 'users', hint: 'T3, seat 4' },
  { id: 'guest-meera', label: 'Meera Iyer', group: 'Guests', icon: 'users', hint: 'Unseated' },
];

type Args = StCommandPalette & { onRun: (id: string) => void };

const meta: Meta<Args> = {
  title: 'Overlay/Command palette',
  component: StCommandPalette,
  decorators: [moduleMetadata({ imports: [StButton, StKbd] })],
  parameters: { layout: 'fullscreen' },
  args: { items: COMMANDS, onRun: fn() },
  argTypes: { onRun: { action: 'run' } },
  render: (args) => ({
    props: { ...args, open: signal(args.open ?? false) },
    template: `
      <div style="min-height: 100vh; padding: 24px">
        <button stButton (click)="open.set(true)">Search <st-kbd keys="Mod+K" /></button>
      </div>
      <st-command-palette [(open)]="open" [items]="items" (run)="onRun($event)" />
    `,
  }),
};
export default meta;

type Story = StoryObj<Args>;

export const Open: Story = { args: { open: true } };

/** Type initials, move with the arrows, run with Enter. Focus returns to the trigger. */
export const KeyboardFlow: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /Search/ });
    await userEvent.click(trigger);

    const input = await canvas.findByRole('combobox');
    await waitFor(() => expect(input).toHaveFocus());

    await userEvent.type(input, 'go');
    const listbox = canvas.getByRole('listbox');
    await waitFor(() => expect(within(listbox).getAllByRole('option')).toHaveLength(3));
    const active = () => canvasElement.querySelector(`#${input.getAttribute('aria-activedescendant')}`);
    await waitFor(() => expect(active()).toHaveTextContent('Go to guests'));

    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(active()).toHaveTextContent('Go to floor plan'));
    await expect(active()).toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{Enter}');
    await expect(args.onRun).toHaveBeenCalledWith('go-plan');
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};

/** Word initials match: "asg" finds "Auto-seat guests". */
export const InitialsMatch: Story = {
  args: { open: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByRole('combobox');
    await userEvent.type(input, 'asg');
    await waitFor(() => expect(canvas.getAllByRole('option')).toHaveLength(1));
    await userEvent.click(canvas.getByRole('option', { name: /Auto-seat guests/ }));
    await expect(args.onRun).toHaveBeenCalledWith('auto-seat');
  },
};

export const NoResults: Story = {
  args: { open: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByRole('combobox');
    await userEvent.type(input, 'qwerty');
    // The panel fades in from transparent, so wait for it to settle.
    await waitFor(() => expect(canvas.getByText('No matches for "qwerty"')).toBeVisible());
    await expect(input).not.toHaveAttribute('aria-activedescendant');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
};
