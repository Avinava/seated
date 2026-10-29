import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StButton, type ButtonSize, type ButtonVariant } from './button';

@Component({
  imports: [StButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button stButton [variant]="variant()" [size]="size()" (click)="clicks.set(clicks() + 1)">Save</button>
    <a stButton href="#top">Top</a>
  `,
})
class Host {
  readonly variant = signal<ButtonVariant>('primary');
  readonly size = signal<ButtonSize>('md');
  readonly clicks = signal(0);
}

describe('StButton', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    return { fixture, button };
  }

  it('keeps the native element and projects its label', () => {
    const { button, fixture } = setup();
    expect(button.textContent?.trim()).toBe('Save');
    expect(button.classList).toContain('st-button');
    expect((fixture.nativeElement as HTMLElement).querySelector('a.st-button')?.getAttribute('href')).toBe('#top');
  });

  it('reflects variant and size for styling', async () => {
    const { fixture, button } = setup();
    expect(button.dataset['variant']).toBe('primary');
    fixture.componentInstance.variant.set('danger');
    fixture.componentInstance.size.set('sm');
    await fixture.whenStable();
    expect(button.dataset['variant']).toBe('danger');
    expect(button.dataset['size']).toBe('sm');
  });

  it('defaults to a medium secondary button', () => {
    const fixture = TestBed.createComponent(StButton);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.dataset['variant']).toBe('secondary');
    expect(host.dataset['size']).toBe('md');
  });

  it('stays a real button for keyboard and click', () => {
    const { fixture, button } = setup();
    button.click();
    expect(fixture.componentInstance.clicks()).toBe(1);
  });
});
