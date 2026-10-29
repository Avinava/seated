import { TestBed } from '@angular/core/testing';
import { Hotkeys } from './hotkeys';

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(e);
  return e;
}

describe('Hotkeys', () => {
  let keys: Hotkeys;
  const isApple = /Mac|iPhone|iPad/.test(navigator.platform);
  const mod = isApple ? { metaKey: true } : { ctrlKey: true };

  beforeEach(() => {
    keys = TestBed.inject(Hotkeys);
  });

  it('runs the binding for a mod chord and prevents the default', () => {
    const run = vi.fn();
    const off = keys.on('mod+k', run);
    const e = press('k', mod);
    expect(run).toHaveBeenCalledOnce();
    expect(e.defaultPrevented).toBe(true);
    off();
  });

  it('matches modifiers regardless of how the chord was written', () => {
    const run = vi.fn();
    const off = keys.on('shift+mod+z', run);
    press('Z', { ...mod, shiftKey: true });
    expect(run).toHaveBeenCalledOnce();
    off();
  });

  it('lets the latest binding win, and falls back when it is removed', () => {
    const page = vi.fn();
    const dialog = vi.fn();
    const offPage = keys.on('escape', page);
    const offDialog = keys.on('escape', dialog);
    press('Escape');
    offDialog();
    press('Escape');
    expect(dialog).toHaveBeenCalledOnce();
    expect(page).toHaveBeenCalledOnce();
    offPage();
  });

  it('ignores plain keys while typing, but not mod chords', () => {
    const input = document.createElement('input');
    document.body.append(input);
    const plain = vi.fn();
    const chord = vi.fn();
    const offs = [keys.on('escape', plain), keys.on('mod+k', chord)];
    press('Escape', {}, input);
    press('k', mod, input);
    expect(plain).not.toHaveBeenCalled();
    expect(chord).toHaveBeenCalledOnce();
    offs.forEach((off) => off());
    input.remove();
  });

  it('labels chords for the platform', () => {
    expect(keys.label('mod+k')).toBe(isApple ? '⌘K' : 'Ctrl+K');
  });
});
