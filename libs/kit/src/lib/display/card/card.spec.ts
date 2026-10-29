import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StCard } from './card';

@Component({
  imports: [StCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-card id="plain"><p>Body</p></st-card>
    <st-card id="lift" interactive padding="lg"><a href="#e">Mehta wedding</a></st-card>
  `,
})
class Host {}

describe('StCard', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return (id: string) => el.querySelector<HTMLElement>(`#${id}`)!;
  }

  it('projects content on a medium-padded surface', () => {
    const card = setup()('plain');
    expect(card.querySelector('p')?.textContent).toBe('Body');
    expect(card.dataset['padding']).toBe('md');
    expect(card.classList).not.toContain('is-interactive');
  });

  it('opts into the hover lift without becoming a control itself', () => {
    const card = setup()('lift');
    expect(card.classList).toContain('is-interactive');
    expect(card.getAttribute('role')).toBeNull();
    expect(card.getAttribute('tabindex')).toBeNull();
    expect(card.querySelector('a')?.getAttribute('href')).toBe('#e');
  });
});
