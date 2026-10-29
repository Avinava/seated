import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { layoutFreeInteractivity } from '../testing';
import { StCommandPalette } from './command-palette';
import type { PaletteItem } from './palette-filter';

const ITEMS: PaletteItem[] = [
  { id: 'guests', label: 'Go to guests', group: 'Navigate', icon: 'users', shortcut: 'G+G' },
  { id: 'plan', label: 'Go to floor plan', group: 'Navigate', icon: 'map-pin' },
  { id: 'auto', label: 'Auto-seat guests', group: 'Actions', icon: 'sparkles', hint: 'Fill empty seats' },
  { id: 'undo', label: 'Undo', group: 'Actions', icon: 'undo', shortcut: 'Mod+Z' },
];

@Component({
  imports: [StCommandPalette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" id="opener" (click)="open.set(true)">Search</button>
    <st-command-palette [(open)]="open" [items]="items" (run)="ran.push($event)" (closed)="closes = closes + 1" />
  `,
})
class Host {
  readonly open = signal(false);
  readonly items = ITEMS;
  readonly ran: string[] = [];
  closes = 0;
}

describe('StCommandPalette', () => {
  let fixture: ComponentFixture<Host>;
  let root: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [layoutFreeInteractivity] });
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    root = fixture.nativeElement;
    await fixture.whenStable();
    const opener = root.querySelector<HTMLButtonElement>('#opener')!;
    opener.focus();
    opener.click();
    await settle();
  });

  afterEach(() => fixture.destroy());

  async function settle() {
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  }

  const input = () => root.querySelector<HTMLInputElement>('input[role="combobox"]')!;
  const options = () => [...root.querySelectorAll<HTMLElement>('[role="option"]')];
  const active = () => root.querySelector<HTMLElement>(`#${input().getAttribute('aria-activedescendant')}`);

  async function type(text: string) {
    input().value = text;
    input().dispatchEvent(new Event('input'));
    await settle();
  }

  // Only `key` is set: the palette must not depend on the legacy keyCode.
  async function press(key: string) {
    input().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await settle();
  }

  it('opens a modal with the search combobox focused and wired to the listbox', () => {
    const dialog = root.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(input());
    const list = root.querySelector('[role="listbox"]')!;
    expect(input().getAttribute('aria-controls')).toBe(list.id);
    expect(input().getAttribute('aria-expanded')).toBe('true');
  });

  it('lists every item under labelled groups and activates the first', () => {
    const groups = [...root.querySelectorAll('[role="group"]')];
    expect(groups.map((g) => root.querySelector(`#${g.getAttribute('aria-labelledby')}`)?.textContent)).toEqual([
      'Navigate',
      'Actions',
    ]);
    expect(options()).toHaveLength(4);
    expect(active()?.textContent).toContain('Go to guests');
    expect(active()?.getAttribute('aria-selected')).toBe('true');
  });

  it('filters as you type and re-activates the best match', async () => {
    await type('asg');
    expect(options().map((o) => o.textContent?.trim())).toEqual([expect.stringContaining('Auto-seat guests')]);
    expect(active()?.textContent).toContain('Auto-seat guests');
    expect(root.querySelector('[role="status"]')?.textContent).toBe('1 result');
  });

  it('moves the active option with the arrow keys, wrapping at the ends', async () => {
    await press('ArrowDown');
    expect(active()?.textContent).toContain('Go to floor plan');
    await press('ArrowUp');
    await press('ArrowUp');
    expect(active()?.textContent).toContain('Undo');
    expect(options().filter((o) => o.getAttribute('aria-selected') === 'true')).toHaveLength(1);
  });

  it('keeps an arrow-key move after filtering', async () => {
    await type('go');
    await press('ArrowDown');
    await settle();
    expect(active()?.textContent).toContain('Go to floor plan');
  });

  it('runs the active command on Enter and closes', async () => {
    await press('ArrowDown');
    await press('Enter');
    expect(fixture.componentInstance.ran).toEqual(['plan']);
    expect(fixture.componentInstance.open()).toBe(false);
    expect(fixture.componentInstance.closes).toBe(1);
  });

  it('runs a command on click', async () => {
    options()[2]!.click();
    await settle();
    expect(fixture.componentInstance.ran).toEqual(['auto']);
  });

  it('shows an empty state and clears the active descendant when nothing matches', async () => {
    await type('zzz');
    expect(options()).toHaveLength(0);
    expect(input().hasAttribute('aria-activedescendant')).toBe(false);
    expect(root.querySelector('.empty')?.textContent).toContain('No matches for "zzz"');
    await press('Enter');
    expect(fixture.componentInstance.ran).toEqual([]);
  });

  it('closes on Escape without running anything and restores focus', async () => {
    await press('Escape');
    expect(fixture.componentInstance.open()).toBe(false);
    expect(fixture.componentInstance.ran).toEqual([]);
    expect(document.activeElement).toBe(root.querySelector('#opener'));
  });

  it('starts from an empty query each time it opens', async () => {
    await type('undo');
    await press('Escape');
    fixture.componentInstance.open.set(true);
    await settle();
    expect(input().value).toBe('');
    expect(options()).toHaveLength(4);
  });
});
