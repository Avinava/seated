import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StInput } from '../input/input';
import { StField } from './field';

@Component({
  imports: [StField, StInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-field label="Email" [hint]="hint()" [error]="error()" [required]="required()">
      <input stInput type="email" />
    </st-field>
  `,
})
class Host {
  readonly hint = signal<string | undefined>('For the RSVP link');
  readonly error = signal<string | null>(null);
  readonly required = signal(true);
}

describe('StField', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const control = el.querySelector('input')!;
    const label = el.querySelector('label')!;
    return { fixture, el, control, label };
  }

  it('labels the projected control', async () => {
    const { control, label } = await setup();
    expect(control.id).toBeTruthy();
    expect(label.htmlFor).toBe(control.id);
    expect(control.labels?.[0]).toBe(label);
  });

  it('describes the control by its hint', async () => {
    const { el, control } = await setup();
    const hint = el.querySelector('.hint')!;
    expect(control.getAttribute('aria-describedby')).toBe(hint.id);
    expect(control.getAttribute('aria-invalid')).toBeNull();
  });

  it('adds the error to the description and marks the control invalid', async () => {
    const { fixture, el, control } = await setup();
    fixture.componentInstance.error.set('Enter a valid email');
    await fixture.whenStable();
    const error = el.querySelector('.error')!;
    expect(error.textContent).toContain('Enter a valid email');
    expect(control.getAttribute('aria-describedby')?.split(' ')).toEqual([el.querySelector('.hint')!.id, error.id]);
    expect(control.getAttribute('aria-invalid')).toBe('true');
    expect(error.closest('[aria-live]')?.getAttribute('aria-live')).toBe('polite');
  });

  it('clears the invalid state when the error goes away', async () => {
    const { fixture, el, control } = await setup();
    fixture.componentInstance.error.set('Enter a valid email');
    await fixture.whenStable();
    fixture.componentInstance.error.set('');
    await fixture.whenStable();
    expect(el.querySelector('.error')).toBeNull();
    expect(control.hasAttribute('aria-invalid')).toBe(false);
    expect(control.getAttribute('aria-describedby')).toBe(el.querySelector('.hint')!.id);
  });

  it('drops aria-describedby when there is nothing to describe', async () => {
    const { fixture, control } = await setup();
    fixture.componentInstance.hint.set(undefined);
    await fixture.whenStable();
    expect(control.hasAttribute('aria-describedby')).toBe(false);
  });

  it('shows a decorative required marker and sets aria-required', async () => {
    const { fixture, el, control } = await setup();
    expect(el.querySelector('.required')?.getAttribute('aria-hidden')).toBe('true');
    expect(control.getAttribute('aria-required')).toBe('true');
    fixture.componentInstance.required.set(false);
    await fixture.whenStable();
    expect(el.querySelector('.required')).toBeNull();
    expect(control.hasAttribute('aria-required')).toBe(false);
  });
});
