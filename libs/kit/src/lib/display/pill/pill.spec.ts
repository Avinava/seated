import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { toTone, toneVars } from '../../shared/tone';
import { StPill } from './pill';

@Component({
  imports: [StPill],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-pill id="n">Pending</st-pill>
    <st-pill id="c" tone="2">Groom's side</st-pill>
    <st-pill id="b" [tone]="4">Friends</st-pill>
    <st-pill id="d" tone="danger" mono>Declined</st-pill>
  `,
})
class Host {}

describe('StPill', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return (id: string) => el.querySelector<HTMLElement>(`#${id}`)!;
  }

  it('is neutral by default and has no tone dot', () => {
    const pill = setup()('n');
    expect(pill.dataset['tone']).toBe('neutral');
    expect(pill.querySelector('.dot')).toBeNull();
    expect(pill.textContent?.trim()).toBe('Pending');
  });

  it('accepts a category tone as an attribute string or a bound number', () => {
    const get = setup();
    expect(get('c').dataset['tone']).toBe('2');
    expect(get('c').style.getPropertyValue('--_soft')).toBe('var(--st-cat-2-soft)');
    expect(get('b').style.getPropertyValue('--_fg')).toBe('var(--st-cat-4)');
  });

  it('pairs colour with text and a decorative dot', () => {
    const pill = setup()('d');
    expect(pill.querySelector('.dot')?.getAttribute('aria-hidden')).toBe('true');
    expect(pill.classList).toContain('is-mono');
    expect(pill.style.getPropertyValue('--_fg')).toBe('var(--st-danger)');
  });
});

describe('tone helpers', () => {
  it.each([
    [undefined, 'neutral'],
    [null, 'neutral'],
    ['3', 3],
    [1, 1],
    ['ok', 'ok'],
  ] as const)('toTone(%s) is %s', (input, expected) => {
    expect(toTone(input)).toBe(expected);
  });

  it('maps neutral to surface tokens and status tones to their soft pair', () => {
    expect(toneVars('neutral')).toEqual({ fg: 'var(--st-text-3)', soft: 'var(--st-surface-2)' });
    expect(toneVars('warn')).toEqual({ fg: 'var(--st-warn)', soft: 'var(--st-warn-soft)' });
  });
});
