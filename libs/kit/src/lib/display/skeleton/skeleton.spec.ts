import { TestBed } from '@angular/core/testing';
import { StSkeleton } from './skeleton';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(StSkeleton);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('StSkeleton', () => {
  it('is hidden from assistive tech', () => {
    expect(render({}).getAttribute('aria-hidden')).toBe('true');
  });

  it('defaults to a line and exposes its shape', () => {
    expect(render({}).dataset['shape']).toBe('line');
    expect(render({ shape: 'circle' }).dataset['shape']).toBe('circle');
  });

  it('applies explicit dimensions', () => {
    const el = render({ shape: 'block', width: '60%', height: '120px' });
    expect(el.style.width).toBe('60%');
    expect(el.style.height).toBe('120px');
  });
});
