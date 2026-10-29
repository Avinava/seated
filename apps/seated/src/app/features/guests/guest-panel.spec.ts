import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ToastService } from '@seated/kit';
import { CLOCK } from '../../core/clock';
import { EventRepository } from '../../core/storage/event-repository';
import { MemoryRepository } from '../../core/storage/memory-repository';
import { Actions } from '../../state/actions';
import { EventStore } from '../../state/event-store';
import { EMAIL_CHECK_DELAY } from './guest-form';
import { GuestPanel } from './guest-panel';
import { NOW, layoutFreeInteractivity, settle, wedding } from './testing';

@Component({
  imports: [GuestPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<st-guest-panel [guestKey]="key()" (closed)="closes = closes + 1; key.set(null)" />`,
})
class Host {
  readonly key = signal<string | null>(null);
  closes = 0;
}

describe('GuestPanel', () => {
  async function setup(key: string) {
    const event = wedding();
    TestBed.configureTestingModule({
      providers: [
        { provide: EventRepository, useValue: new MemoryRepository([event]) },
        { provide: CLOCK, useValue: () => NOW },
        provideRouter([]),
        layoutFreeInteractivity,
      ],
    });
    const store = TestBed.inject(EventStore);
    await store.open(event.id);
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.componentInstance.key.set(key);
    await settle(fixture);

    const panel = () => document.querySelector<HTMLElement>('st-drawer [role="dialog"]');
    const field = (label: string) => {
      const l = Array.from(panel()!.querySelectorAll('label')).find((x) => x.textContent?.trim().startsWith(label));
      return document.getElementById(l!.htmlFor) as HTMLInputElement | HTMLSelectElement;
    };
    const type = async (label: string, value: string) => {
      const input = field(label);
      input.value = value;
      input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'));
      input.dispatchEvent(new Event('blur'));
      await settle(fixture);
    };
    const button = (text: string) =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text);
    /** Save waits for the debounced email check, so give it time. */
    const save = async () => {
      button(key === 'new' ? 'Add guest' : 'Save')!.click();
      await new Promise((r) => setTimeout(r, EMAIL_CHECK_DELAY + 50));
      await settle(fixture);
    };
    return { fixture, store, panel, field, type, button, save, host: fixture.componentInstance };
  }

  it('shows the guest and their seat', async () => {
    const { panel } = await setup('g-009');
    expect(panel()?.querySelector('h2')?.textContent).toBe('Kamla Mehta');
    expect(panel()?.textContent).toContain("Bride's family · The Mehtas");
    expect(panel()?.textContent).toContain('T1, seat 1');
    expect(panel()?.querySelector('.conflict')).toBeNull();
  });

  it('lists the rules a guest is breaking', async () => {
    const { store } = await setup('g-009');
    const [guestId] = [...(store.report()?.conflictsByGuest.keys() ?? [])];
    const name = store.guestsById().get(guestId!)!.name;
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.componentInstance.key.set(guestId!);
    await settle(fixture);
    const conflict = fixture.nativeElement.querySelector('.conflict') as HTMLElement;
    expect(conflict.textContent).toContain('apart');
    expect(conflict.textContent).toContain(name);
  });

  it('will not save without a name, and points at the problem', async () => {
    const { panel, save, store, host } = await setup('new');
    const before = store.guests().length;
    await save();
    const name = panel()!.querySelector<HTMLInputElement>('input[formcontrolname="name"]')!;
    expect(name.getAttribute('aria-invalid')).toBe('true');
    const errorId = name.getAttribute('aria-describedby')!;
    expect(document.getElementById(errorId)?.textContent).toContain("Enter the guest's name");
    expect(document.activeElement).toBe(name);
    expect(store.guests()).toHaveLength(before);
    expect(host.closes).toBe(0);
  });

  it('needs a dietary note when the meal is Other', async () => {
    const { type, save, panel } = await setup('g-009');
    await type('Meal', 'other');
    await save();
    expect(panel()?.textContent).toContain('Say what "Other" means for the kitchen');
    await type('Dietary needs', 'Keto');
    expect(panel()?.textContent).not.toContain('Say what "Other" means');
  });

  it('flags an email another guest already uses, after a pause', async () => {
    const { type, panel, fixture } = await setup('g-009');
    await type('Email', 'ananya.iyer@example.com');
    expect(panel()?.querySelector('input[type="email"]')?.getAttribute('aria-busy')).toBe('true');
    await new Promise((r) => setTimeout(r, 350));
    await settle(fixture);
    expect(panel()?.textContent).toContain('Ananya Iyer already uses this email');
  });

  it('saves as one undoable command and closes', async () => {
    const { type, save, store, host } = await setup('g-009');
    await type('Full name', 'Kamla Devi Mehta');
    await save();
    expect(store.guestsById().get('g-009')?.name).toBe('Kamla Devi Mehta');
    expect(TestBed.inject(ToastService).current()?.message).toBe('Saved Kamla Devi Mehta');
    expect(host.closes).toBe(1);
    TestBed.inject(Actions).undo();
    expect(store.guestsById().get('g-009')?.name).toBe('Kamla Mehta');
  });

  it('adds plus-ones who share the party, and one Undo takes them away', async () => {
    const { button, fixture, save, store } = await setup('g-009');
    const before = store.guests().length;
    button('Add plus-one')!.click();
    await settle(fixture);
    const input = document.querySelector<HTMLInputElement>('[data-plus-one="0"]')!;
    expect(document.activeElement).toBe(input);
    input.value = 'Ravi Mehta';
    input.dispatchEvent(new Event('input'));
    await settle(fixture);
    await save();
    const ravi = store.guests().find((g) => g.name === 'Ravi Mehta');
    expect(ravi).toMatchObject({ plusOneOf: 'g-009', partyId: store.guestsById().get('g-009')?.partyId });
    expect(store.guests()).toHaveLength(before + 1);
    TestBed.inject(Actions).undo();
    expect(store.guests()).toHaveLength(before);
  });

  it('asks before throwing away unsaved changes', async () => {
    const { type, panel, button, fixture, host } = await setup('g-009');
    await type('Notes', 'Bring a cushion');
    panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle(fixture);
    expect(host.closes).toBe(0);
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain('Discard your changes?');
    button('Keep editing')!.click();
    await settle(fixture);
    expect(panel()).not.toBeNull();
    panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle(fixture);
    button('Discard')!.click();
    await settle(fixture);
    expect(host.closes).toBe(1);
  });

  it('deletes a guest after confirming', async () => {
    const { button, fixture, store, host } = await setup('g-009');
    button('Delete')!.click();
    await settle(fixture);
    expect(document.querySelector('[role="alertdialog"] h2')?.textContent).toBe('Delete Kamla Mehta?');
    button('Delete guest')!.click();
    await settle(fixture);
    expect(store.guestsById().has('g-009')).toBe(false);
    expect(host.closes).toBe(1);
  });
});
