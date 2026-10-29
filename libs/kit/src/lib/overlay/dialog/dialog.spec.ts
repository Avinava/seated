import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { layoutFreeInteractivity } from '../testing';
import { StDialog, type DialogRole } from './dialog';

@Component({
  imports: [StDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" id="opener" (click)="open.set(true)">Delete table</button>
    <st-dialog [(open)]="open" heading="Delete table T3?" [dialogRole]="role()" [hideClose]="hideClose()">
      Six guests will move back to the unseated list.
      <ng-container stDialogFooter>
        <button type="button" id="cancel" (click)="open.set(false)">Cancel</button>
      </ng-container>
    </st-dialog>
  `,
})
class Host {
  readonly open = signal(false);
  readonly role = signal<DialogRole>('dialog');
  readonly hideClose = signal(false);
}

describe('StDialog', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [layoutFreeInteractivity] }));

  async function setup(role: DialogRole = 'dialog') {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.role.set(role);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const opener = root.querySelector<HTMLButtonElement>('#opener')!;
    opener.focus();
    opener.click();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    return { fixture, root, opener, panel: () => root.querySelector<HTMLElement>('.panel') };
  }

  it('is a labelled modal dialog with body and footer slots', async () => {
    const { panel, root } = await setup();
    const p = panel()!;
    expect(p.getAttribute('role')).toBe('dialog');
    expect(p.getAttribute('aria-modal')).toBe('true');
    expect(root.querySelector(`#${p.getAttribute('aria-labelledby')}`)?.textContent).toBe('Delete table T3?');
    expect(p.querySelector('.body')?.textContent).toContain('Six guests');
    expect(p.querySelector('.footer #cancel')).not.toBeNull();
  });

  it('traps focus inside and restores it to the opener after Escape', async () => {
    const { fixture, panel, opener } = await setup();
    expect(panel()!.contains(document.activeElement)).toBe(true);
    panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('closes on a scrim click', async () => {
    const { fixture, root } = await setup();
    root.querySelector<HTMLElement>('.scrim')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('as an alertdialog ignores scrim clicks but still honours Escape', async () => {
    const { fixture, root, panel } = await setup('alertdialog');
    expect(panel()!.getAttribute('role')).toBe('alertdialog');
    root.querySelector<HTMLElement>('.scrim')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(true);
    panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('can hide the close button', async () => {
    const { fixture, panel } = await setup();
    expect(panel()!.querySelector('button[aria-label="Close"]')).not.toBeNull();
    fixture.componentInstance.hideClose.set(true);
    await fixture.whenStable();
    expect(panel()!.querySelector('button[aria-label="Close"]')).toBeNull();
  });
});
