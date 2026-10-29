import { TestBed } from '@angular/core/testing';
import { StStat } from './stat';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(StStat);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('StStat', () => {
  it('pairs the label and value in a description list', () => {
    const el = render({ label: 'Seated', value: 168 });
    expect(el.querySelector('dt')?.textContent).toBe('Seated');
    expect(el.querySelector('dd.value')?.textContent).toBe('168');
  });

  it('adds the caption only when given', () => {
    expect(render({ label: 'Seated', value: 168 }).querySelector('.caption')).toBeNull();
    expect(render({ label: 'Seated', value: '168', caption: 'of 207' }).querySelector('.caption')?.textContent).toBe(
      'of 207',
    );
  });
});
