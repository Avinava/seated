import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StCheckbox } from './checkbox';

@Component({
  imports: [StCheckbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-checkbox [(checked)]="checked" [(indeterminate)]="mixed" [disabled]="disabled()">Vegetarian only</st-checkbox>
    <st-checkbox ariaLabel="Select all guests" />
  `,
})
class Host {
  readonly checked = signal(false);
  readonly mixed = signal(false);
  readonly disabled = signal(false);
}

describe('StCheckbox', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const [input, bare] = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('input'),
    ) as HTMLInputElement[];
    return { fixture, input: input!, bare: bare! };
  }

  it('is a native checkbox labelled by its projected text', async () => {
    const { input } = await setup();
    expect(input.type).toBe('checkbox');
    expect(input.closest('label')?.textContent?.trim()).toBe('Vegetarian only');
  });

  it('uses ariaLabel when there is no visible label', async () => {
    const { bare } = await setup();
    expect(bare.getAttribute('aria-label')).toBe('Select all guests');
  });

  it('toggles and writes the checked model', async () => {
    const { fixture, input } = await setup();
    input.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.checked()).toBe(true);
    expect(input.checked).toBe(true);
  });

  it('reflects model changes from the parent', async () => {
    const { fixture, input } = await setup();
    fixture.componentInstance.checked.set(true);
    await fixture.whenStable();
    expect(input.checked).toBe(true);
  });

  it('shows the mixed state and clears it on toggle', async () => {
    const { fixture, input } = await setup();
    fixture.componentInstance.mixed.set(true);
    await fixture.whenStable();
    expect(input.indeterminate).toBe(true);
    input.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.mixed()).toBe(false);
    expect(input.indeterminate).toBe(false);
    expect(fixture.componentInstance.checked()).toBe(true);
  });

  it('disables the native input', async () => {
    const { fixture, input } = await setup();
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    expect(input.disabled).toBe(true);
  });
});
