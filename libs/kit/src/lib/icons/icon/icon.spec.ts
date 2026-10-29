import { TestBed } from '@angular/core/testing';
import { StIcon } from './icon';
import { ICON_NAMES, ICONS } from './icons';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(StIcon);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('StIcon', () => {
  it('renders one path per registry segment on a 24 unit grid', () => {
    const el = render({ name: 'users' });
    const svg = el.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.querySelectorAll('path')).toHaveLength(ICONS.users.length);
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('stroke-width')).toBe('1.75');
  });

  it('is decorative unless labelled', () => {
    const el = render({ name: 'search' });
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('role')).toBeNull();
  });

  it('becomes an image with an accessible name when labelled', () => {
    const el = render({ name: 'alert', label: 'Conflict' });
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Conflict');
    expect(el.getAttribute('aria-hidden')).toBeNull();
  });

  it('accepts the size as an attribute string', () => {
    const el = render({ name: 'x', size: '20' });
    expect(el.querySelector('svg')!.getAttribute('width')).toBe('20');
  });

  it('has a well-formed path for every registered icon', () => {
    expect(ICON_NAMES.length).toBeGreaterThanOrEqual(30);
    for (const name of ICON_NAMES) {
      for (const d of ICONS[name]) expect(d, name).toMatch(/^[Mm][\d.\s,a-zA-Z-]+$/);
    }
  });
});
