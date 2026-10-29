import { TestBed } from '@angular/core/testing';
import { StBar } from './bar';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(StBar);
  fixture.componentRef.setInput('label', 'T3 filled');
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('StBar', () => {
  it('is a labelled progressbar', () => {
    const el = render({ value: 8, max: 10 });
    expect(el.getAttribute('role')).toBe('progressbar');
    expect(el.getAttribute('aria-label')).toBe('T3 filled');
    expect(el.getAttribute('aria-valuenow')).toBe('8');
    expect(el.getAttribute('aria-valuetext')).toBe('8 of 10');
  });

  it('fills in proportion and clamps', () => {
    expect(render({ value: 8, max: 10 }).querySelector<HTMLElement>('.fill')!.style.inlineSize).toBe('80%');
    expect(render({ value: 14, max: 10 }).querySelector<HTMLElement>('.fill')!.style.inlineSize).toBe('100%');
  });

  it('accepts attribute strings for numbers and exposes the tone', () => {
    const el = render({ value: '3', max: '4', tone: 'danger' });
    expect(el.getAttribute('aria-valuenow')).toBe('3');
    expect(el.dataset['tone']).toBe('danger');
  });
});
