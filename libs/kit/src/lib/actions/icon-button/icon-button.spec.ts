import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StIconButton } from './icon-button';

@Component({
  imports: [StIconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button stIconButton icon="undo" aria-label="Undo" (click)="clicks.set(clicks() + 1)"></button>
    <button stIconButton icon="filter" aria-label="Show filters" [pressed]="pressed()" size="sm"></button>
  `,
})
class Host {
  readonly clicks = signal(0);
  readonly pressed = signal(false);
}

describe('StIconButton', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const [action, toggle] = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ) as HTMLButtonElement[];
    return { fixture, action: action!, toggle: toggle! };
  }

  it('takes its accessible name from the required aria-label input', () => {
    const { action } = setup();
    expect(action.getAttribute('aria-label')).toBe('Undo');
    expect(action.getAttribute('title')).toBe('Undo');
  });

  it('renders a decorative icon only', () => {
    const { action } = setup();
    const icon = action.querySelector('st-icon')!;
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(action.textContent?.trim()).toBe('');
  });

  it('is a plain action unless pressed is bound', async () => {
    const { fixture, action, toggle } = setup();
    expect(action.hasAttribute('aria-pressed')).toBe(false);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fixture.componentInstance.pressed.set(true);
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('uses a smaller glyph at the small size', () => {
    const { toggle } = setup();
    expect(toggle.dataset['size']).toBe('sm');
    expect(toggle.querySelector('svg')!.getAttribute('width')).toBe('14');
  });

  it('clicks like a native button', () => {
    const { fixture, action } = setup();
    action.click();
    expect(fixture.componentInstance.clicks()).toBe(1);
  });
});
