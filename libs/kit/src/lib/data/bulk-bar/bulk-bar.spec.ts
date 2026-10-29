import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StButton } from '../../actions/button/button';
import { StBulkBar } from './bulk-bar';

@Component({
  imports: [StBulkBar, StButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-bulk-bar [count]="count()" (cleared)="clears.set(clears() + 1)">
      <button stButton variant="ghost" size="sm">Assign table</button>
    </st-bulk-bar>
  `,
})
class Host {
  readonly count = signal(3);
  readonly clears = signal(0);
}

describe('StBulkBar', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const bar = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('st-bulk-bar')!;
    return { fixture, bar };
  }

  it('is a labelled group', () => {
    const { bar } = setup();
    expect(bar.getAttribute('role')).toBe('group');
    expect(bar.getAttribute('aria-label')).toBe('Bulk actions');
  });

  it('announces the count politely and updates it', async () => {
    const { fixture, bar } = setup();
    const count = bar.querySelector('.count')!;
    expect(count.getAttribute('aria-live')).toBe('polite');
    expect(count.textContent?.trim()).toBe('3 selected');
    fixture.componentInstance.count.set(12);
    await fixture.whenStable();
    expect(count.textContent?.trim()).toBe('12 selected');
    fixture.componentInstance.count.set(1200);
    await fixture.whenStable();
    expect(count.textContent?.trim()).toBe('1,200 selected');
  });

  it('projects the owner actions before the Clear button', () => {
    const { bar } = setup();
    const buttons = Array.from(bar.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(buttons).toEqual(['Assign table', 'Clear']);
  });

  it('emits cleared from the Clear button', () => {
    const { fixture, bar } = setup();
    const clear = Array.from(bar.querySelectorAll('button')).find((b) => b.textContent?.includes('Clear'))!;
    clear.click();
    expect(fixture.componentInstance.clears()).toBe(1);
  });

  it('stays out of print', () => {
    const { bar } = setup();
    expect(bar.hasAttribute('data-noprint')).toBe(true);
  });
});
