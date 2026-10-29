import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StSwitch } from './switch';

@Component({
  imports: [StSwitch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-switch [(checked)]="on" [disabled]="disabled()">Show seat numbers</st-switch>
    <st-switch ariaLabel="Dark mode" />
  `,
})
class Host {
  readonly on = signal(false);
  readonly disabled = signal(false);
}

describe('StSwitch', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const [labelled, bare] = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ) as HTMLButtonElement[];
    return { fixture, button: labelled!, bare: bare! };
  }

  it('is a native button with the switch role and a name from its content', async () => {
    const { button } = await setup();
    expect(button.getAttribute('role')).toBe('switch');
    expect(button.type).toBe('button');
    expect(button.textContent?.trim()).toBe('Show seat numbers');
    expect(button.getAttribute('aria-checked')).toBe('false');
  });

  it('uses ariaLabel when nothing is projected', async () => {
    const { bare } = await setup();
    expect(bare.getAttribute('aria-label')).toBe('Dark mode');
  });

  it('toggles and writes back through the model', async () => {
    const { fixture, button } = await setup();
    button.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.on()).toBe(true);
    expect(button.getAttribute('aria-checked')).toBe('true');
    button.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.on()).toBe(false);
  });

  it('follows the model from the parent', async () => {
    const { fixture, button } = await setup();
    fixture.componentInstance.on.set(true);
    await fixture.whenStable();
    expect(button.getAttribute('aria-checked')).toBe('true');
  });

  it('cannot be toggled while disabled', async () => {
    const { fixture, button } = await setup();
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    button.click();
    await fixture.whenStable();
    expect(button.disabled).toBe(true);
    expect(fixture.componentInstance.on()).toBe(false);
  });
});
