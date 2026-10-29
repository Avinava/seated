import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StChip } from './chip';

@Component({
  imports: [StChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (t of tags(); track t) {
      <st-chip [label]="t" (removed)="remove(t)" />
    }
    <st-chip id="fixed" label="host" [removable]="false" />
  `,
})
class Host {
  readonly tags = signal(['vip', 'kids table']);
  remove(tag: string): void {
    this.tags.update((all) => all.filter((t) => t !== tag));
  }
}

describe('StChip', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el };
  }

  it('names each remove button after its chip', async () => {
    const { el } = await setup();
    const names = Array.from(el.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));
    expect(names).toEqual(['Remove vip', 'Remove kids table']);
  });

  it('emits removed on click', async () => {
    const { fixture, el } = await setup();
    el.querySelector<HTMLButtonElement>('button[aria-label="Remove vip"]')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.tags()).toEqual(['kids table']);
  });

  it.each(['Backspace', 'Delete'])('emits removed on %s', async (key) => {
    const { fixture, el } = await setup();
    const button = el.querySelector<HTMLButtonElement>('button[aria-label="Remove kids table"]')!;
    button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.tags()).toEqual(['vip']);
  });

  it('has no remove button when not removable', async () => {
    const { el } = await setup();
    const fixed = el.querySelector('#fixed')!;
    expect(fixed.querySelector('button')).toBeNull();
    expect(fixed.textContent?.trim()).toBe('host');
  });
});
