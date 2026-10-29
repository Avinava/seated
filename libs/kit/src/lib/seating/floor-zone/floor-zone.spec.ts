import { TestBed } from '@angular/core/testing';
import { StFloorZone } from './floor-zone';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(StFloorZone);
  for (const [k, v] of Object.entries({ x: 40, y: 60, w: 320, h: 80, ...inputs })) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('StFloorZone', () => {
  it('positions itself in plan units', () => {
    const el = render({ kind: 'stage', label: 'Stage' });
    expect([el.style.left, el.style.top, el.style.width, el.style.height]).toEqual(['40px', '60px', '320px', '80px']);
  });

  it('shows its label as text and exposes the kind for styling', () => {
    const el = render({ kind: 'exit', label: 'Exit' });
    expect(el.textContent?.trim()).toBe('Exit');
    expect(el.dataset['kind']).toBe('exit');
  });

  it('accepts attribute strings for coordinates', () => {
    const el = render({ kind: 'bar', label: 'Bar', x: '12', w: '90' });
    expect(el.style.left).toBe('12px');
    expect(el.style.width).toBe('90px');
  });
});
