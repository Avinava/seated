import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StKbd } from './kbd';

@Component({
  imports: [StKbd],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<st-kbd id="combo" keys="Shift+Z" /><st-kbd id="free">Esc</st-kbd><st-kbd id="mod" keys="Mod+K" />`,
})
class Host {}

describe('StKbd', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('splits a combo into one key cap per key inside an outer kbd', () => {
    const el = setup().querySelector('#combo')!;
    const caps = el.querySelectorAll('kbd > kbd');
    expect(caps).toHaveLength(2);
    expect(caps[1]!.textContent).toBe('Z');
    for (const cap of Array.from(caps)) expect(cap.getAttribute('aria-hidden')).toBe('true');
  });

  it('spells the combo out for screen readers', () => {
    const el = setup().querySelector('#combo')!;
    expect(el.querySelector('.st-sr-only')!.textContent).toBe('Shift Z');
  });

  it('maps Mod to the platform command key', () => {
    const el = setup().querySelector('#mod')!;
    const mac = /Mac|iPhone|iPad/.test(navigator.platform);
    expect(el.querySelector('kbd > kbd')!.textContent).toBe(mac ? '⌘' : 'Ctrl');
    expect(el.querySelector('.st-sr-only')!.textContent).toBe(mac ? 'Command K' : 'Control K');
  });

  it('projects free text when no combo is given', () => {
    const el = setup().querySelector('#free')!;
    expect(el.textContent?.trim()).toBe('Esc');
    expect(el.querySelectorAll('kbd')).toHaveLength(2);
  });
});
