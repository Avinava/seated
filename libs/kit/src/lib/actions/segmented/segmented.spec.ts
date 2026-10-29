import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StSegmented, type SegmentedOption } from './segmented';

type Rsvp = 'all' | 'accepted' | 'pending' | 'declined';

@Component({
  imports: [StSegmented],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<st-segmented aria-label="RSVP" [options]="options" [(value)]="value" />`,
})
class Host {
  readonly options: SegmentedOption<Rsvp>[] = [
    { value: 'all', label: 'All', count: 120 },
    { value: 'accepted', label: 'Accepted', count: 84 },
    { value: 'pending', label: 'Pending' },
    { value: 'declined', label: 'Declined', count: 6 },
  ];
  readonly value = signal<Rsvp | null>('accepted');
}

describe('StSegmented', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const group = host.querySelector('st-segmented') as HTMLElement;
    const radios = () => Array.from(group.querySelectorAll<HTMLButtonElement>('[role=radio]'));
    const key = async (k: string) => {
      group.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      await fixture.whenStable();
    };
    return { fixture, group, radios, key };
  }

  it('is a labelled radio group with one checked radio', async () => {
    const { group, radios } = await setup();
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('RSVP');
    expect(radios().map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false', 'false']);
  });

  it('shows counts only when given', async () => {
    const { radios } = await setup();
    expect(radios()[0]!.querySelector('.count')?.textContent).toBe('120');
    expect(radios()[2]!.querySelector('.count')).toBeNull();
  });

  it('keeps a single tab stop on the checked option', async () => {
    const { radios } = await setup();
    expect(radios().map((r) => r.tabIndex)).toEqual([-1, 0, -1, -1]);
  });

  it('falls back to the first option as the tab stop when nothing is selected', async () => {
    const { fixture, radios } = await setup();
    fixture.componentInstance.value.set(null);
    await fixture.whenStable();
    expect(radios()[0]!.tabIndex).toBe(0);
  });

  it('selects on click and writes back through the model', async () => {
    const { fixture, radios } = await setup();
    radios()[3]!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('declined');
  });

  it('moves selection and focus with arrow keys, wrapping at the ends', async () => {
    const { fixture, radios, key } = await setup();
    await key('ArrowRight');
    expect(fixture.componentInstance.value()).toBe('pending');
    expect(document.activeElement).toBe(radios()[2]);
    await key('ArrowRight');
    await key('ArrowRight');
    expect(fixture.componentInstance.value()).toBe('all');
    await key('ArrowLeft');
    expect(fixture.componentInstance.value()).toBe('declined');
  });

  it('jumps with Home and End', async () => {
    const { fixture, key } = await setup();
    await key('End');
    expect(fixture.componentInstance.value()).toBe('declined');
    await key('Home');
    expect(fixture.componentInstance.value()).toBe('all');
  });
});
