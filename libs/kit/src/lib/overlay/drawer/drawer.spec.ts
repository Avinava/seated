import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { layoutFreeInteractivity } from '../testing';
import { StDrawer } from './drawer';

@Component({
  imports: [StDrawer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" id="opener" (click)="open.set(true)">Edit guest</button>
    <st-drawer [(open)]="open" heading="Aarav Shah" description="Bride's family" (closed)="closes = closes + 1">
      <label>Name <input id="name" /></label>
      <button stDrawerFooter type="button" id="save">Save</button>
    </st-drawer>
  `,
})
class Host {
  readonly open = signal(false);
  closes = 0;
}

describe('StDrawer', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [layoutFreeInteractivity] }));

  async function setup() {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const opener = root.querySelector<HTMLButtonElement>('#opener')!;
    const openDrawer = async () => {
      opener.focus();
      opener.click();
      await fixture.whenStable();
      await new Promise((r) => setTimeout(r));
    };
    return { fixture, root, opener, openDrawer, dialog: () => root.querySelector<HTMLElement>('[role="dialog"]') };
  }

  it('renders nothing while closed', async () => {
    const { dialog } = await setup();
    expect(dialog()).toBeNull();
  });

  it('opens as a labelled, described modal dialog with projected content', async () => {
    const { openDrawer, dialog, root } = await setup();
    await openDrawer();
    const d = dialog()!;
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(root.querySelector(`#${d.getAttribute('aria-labelledby')}`)?.textContent).toBe('Aarav Shah');
    expect(root.querySelector(`#${d.getAttribute('aria-describedby')}`)?.textContent).toBe("Bride's family");
    expect(d.querySelector('.body #name')).not.toBeNull();
    expect(d.querySelector('.footer #save')).not.toBeNull();
  });

  it('moves focus inside on open', async () => {
    const { openDrawer, dialog } = await setup();
    await openDrawer();
    expect(dialog()!.contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape, emits closed and restores focus to the opener', async () => {
    const { fixture, openDrawer, dialog, opener } = await setup();
    await openDrawer();
    dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(fixture.componentInstance.closes).toBe(1);
    expect(document.activeElement).toBe(opener);
  });

  it('closes from the close button with an accessible name', async () => {
    const { fixture, openDrawer, dialog } = await setup();
    await openDrawer();
    const close = dialog()!.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!;
    close.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('closes when the scrim is clicked but not when the panel is', async () => {
    const { fixture, openDrawer, root, dialog } = await setup();
    await openDrawer();
    dialog()!.click();
    expect(fixture.componentInstance.open()).toBe(true);
    root.querySelector<HTMLElement>('.scrim')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('does not emit closed when the parent closes it', async () => {
    const { fixture, openDrawer } = await setup();
    await openDrawer();
    fixture.componentInstance.open.set(false);
    await fixture.whenStable();
    expect(fixture.componentInstance.closes).toBe(0);
  });
});
