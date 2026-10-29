import { TestBed } from '@angular/core/testing';
import { StAvatar } from './avatar';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(StAvatar);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('StAvatar', () => {
  it('shows at most two initials', () => {
    expect(render({ initials: ' asx ' }).textContent?.trim()).toBe('as');
  });

  it('is decorative unless labelled', () => {
    const el = render({ initials: 'AS' });
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('role')).toBeNull();
  });

  it('becomes a named image when labelled', () => {
    const el = render({ initials: 'AS', label: 'Aarav Shah' });
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Aarav Shah');
  });

  it('takes its colours from the tone tokens', () => {
    const el = render({ initials: 'AS', tone: 3, size: 'lg' });
    expect(el.style.getPropertyValue('--_soft')).toBe('var(--st-cat-3-soft)');
    expect(el.dataset['size']).toBe('lg');
  });
});
