import { TestBed } from '@angular/core/testing';
import { StProgressRing } from './progress-ring';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(StProgressRing);
  fixture.componentRef.setInput('label', 'Guests seated');
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('StProgressRing', () => {
  it('is a labelled progressbar with its range', () => {
    const el = render({ value: 30, max: 120 });
    expect(el.getAttribute('role')).toBe('progressbar');
    expect(el.getAttribute('aria-label')).toBe('Guests seated');
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('120');
    expect(el.getAttribute('aria-valuenow')).toBe('30');
    expect(el.getAttribute('aria-valuetext')).toBe('30 of 120');
  });

  it('draws the arc with a dash offset proportional to the remainder', () => {
    const el = render({ value: 30, max: 120 });
    const fill = el.querySelector('circle.fill')!;
    const c = 2 * Math.PI * 18;
    expect(fill.getAttribute('r')).toBe('18');
    expect(Number(fill.getAttribute('stroke-dashoffset'))).toBeCloseTo(c * 0.75, 5);
    expect(el.querySelector('.value')!.textContent).toBe('25%');
  });

  it('clamps out-of-range values and handles an empty max', () => {
    expect(render({ value: 150, max: 100 }).getAttribute('aria-valuenow')).toBe('100');
    expect(render({ value: -4 }).getAttribute('aria-valuenow')).toBe('0');
    expect(render({ value: 3, max: 0 }).querySelector('.value')!.textContent).toBe('0%');
  });

  it('marks completion and can hide the centre value', () => {
    const el = render({ value: 10, max: 10, showValue: false });
    expect(el.classList).toContain('is-complete');
    expect(el.querySelector('.value')).toBeNull();
  });
});
