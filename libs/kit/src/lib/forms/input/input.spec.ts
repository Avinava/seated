import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StInput } from './input';

@Component({
  imports: [StInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input stInput aria-label="Search" />
    <input stInput id="named" aria-label="Named" [invalid]="invalid()" />
    <select stInput aria-label="Meal">
      <option>Veg</option>
    </select>
    <textarea stInput aria-label="Notes"></textarea>
  `,
})
class Host {
  readonly invalid = signal(false);
}

describe('StInput', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el };
  }

  it('styles inputs, selects and textareas in place', async () => {
    const { el } = await setup();
    expect(el.querySelectorAll('.st-input')).toHaveLength(4);
    expect(el.querySelector('select.st-input option')?.textContent).toBe('Veg');
  });

  it('gives every control a unique id and keeps an explicit one', async () => {
    const { el } = await setup();
    const ids = Array.from(el.querySelectorAll('.st-input')).map((c) => c.id);
    expect(new Set(ids).size).toBe(4);
    expect(ids[1]).toBe('named');
  });

  it('can be marked invalid outside a field', async () => {
    const { fixture, el } = await setup();
    const named = el.querySelector('#named')!;
    expect(named.hasAttribute('aria-invalid')).toBe(false);
    fixture.componentInstance.invalid.set(true);
    await fixture.whenStable();
    expect(named.getAttribute('aria-invalid')).toBe('true');
  });

  it('exposes the native control for template refs', async () => {
    const { fixture, el } = await setup();
    const named = el.querySelector('#named');
    const debug = fixture.debugElement.query((d) => d.nativeElement === named);
    expect(debug.injector.get(StInput).element).toBe(named);
  });

  it('stays a native control for typing', async () => {
    const { el } = await setup();
    const input = el.querySelector('input')!;
    input.value = 'Aarav';
    input.dispatchEvent(new Event('input'));
    expect(input.value).toBe('Aarav');
  });
});
