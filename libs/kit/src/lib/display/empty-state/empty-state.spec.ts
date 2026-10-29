import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StEmptyState } from './empty-state';

@Component({
  imports: [StEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-empty-state icon="users" heading="No guests yet" [level]="level()">
      Import a CSV or add people one at a time.
      <div actions><button type="button">Add guest</button></div>
    </st-empty-state>
  `,
})
class Host {
  readonly level = signal<2 | 3>(2);
}

describe('StEmptyState', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders the heading at the requested level', async () => {
    const { fixture, el } = await setup();
    expect(el.querySelector('h2')?.textContent).toBe('No guests yet');
    fixture.componentInstance.level.set(3);
    await fixture.whenStable();
    expect(el.querySelector('h2')).toBeNull();
    expect(el.querySelector('h3')?.textContent).toBe('No guests yet');
  });

  it('projects the body and the actions into their slots', async () => {
    const { el } = await setup();
    expect(el.querySelector('.body')?.textContent).toContain('Import a CSV');
    expect(el.querySelector('.actions button')?.textContent).toBe('Add guest');
  });

  it('shows a decorative icon', async () => {
    const { el } = await setup();
    expect(el.querySelector('.badge st-icon')?.getAttribute('aria-hidden')).toBe('true');
  });
});
