import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ToastService } from '@seated/kit';
import { CLOCK } from '../../core/clock';
import { EventRepository } from '../../core/storage/event-repository';
import { MemoryRepository } from '../../core/storage/memory-repository';
import { PaletteRegistry } from '../../shell/palette-registry';
import { Actions } from '../../state/actions';
import { EventStore } from '../../state/event-store';
import GuestsPage from './guests-page';
import { NOW, bigWedding, layoutFreeInteractivity, settle, wedding } from './testing';

describe('GuestsPage', () => {
  async function setup(url: string, event = wedding()) {
    TestBed.configureTestingModule({
      providers: [
        { provide: EventRepository, useValue: new MemoryRepository([event]) },
        { provide: CLOCK, useValue: () => NOW },
        provideRouter([{ path: 'events/:eventId/guests', component: GuestsPage }], withComponentInputBinding()),
        layoutFreeInteractivity,
      ],
    });
    const store = TestBed.inject(EventStore);
    await store.open(event.id);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/events/${event.id}/guests${url}`, GuestsPage);
    await settle(harness.fixture);
    const el = harness.routeNativeElement as HTMLElement;
    const rows = () => Array.from(el.querySelectorAll<HTMLElement>('st-data-grid .row'));
    const names = () => rows().map((r) => r.querySelector('.name-link')?.textContent?.trim());
    const button = (text: string) =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text);
    return { harness, el, store, rows, names, button, router: TestBed.inject(Router) };
  }

  it('shows the event counts in the header', async () => {
    const { el } = await setup('');
    expect(el.querySelector('.summary')?.textContent).toBe('120 guests · 100 coming · 84 seated');
  });

  it.each([
    ['?rsvp=declined', 8, 'Declined'],
    ['?q=kamla', 1, 'Coming'],
    ['?rsvp=pending&tag=kids', -1, 'Awaiting'],
  ])('filters rows from the URL: %s', async (url, expected, rsvp) => {
    const { rows, store } = await setup(url);
    const rendered = rows();
    const want =
      expected >= 0 ? expected : store.guests().filter((g) => g.rsvp === 'pending' && g.tags.includes('kids')).length;
    expect(rendered).toHaveLength(want);
    expect(rendered.every((r) => r.querySelector('.pick st-pill')?.textContent?.includes(rsvp))).toBe(true);
  });

  it('groups and sorts from the URL', async () => {
    const { el, names } = await setup('?rsvp=declined&by=group&sort=name:desc');
    const groups = Array.from(el.querySelectorAll('st-data-grid .group-label')).map((g) => g.textContent);
    expect(groups.length).toBeGreaterThan(0);
    const firstGroup = names().slice(0, Number(el.querySelector('.group-count')?.textContent));
    expect(firstGroup).toEqual([...firstGroup].sort((a = '', b = '') => b.localeCompare(a, 'en-IN')));
  });

  it('counts each RSVP state within the other filters', async () => {
    const { el } = await setup('?q=mehta');
    const tabs = Array.from(el.querySelectorAll('st-segmented [role="radio"]')).map((b) => b.textContent?.trim());
    expect(tabs[0]).toMatch(/^All\s*\d+$/);
    expect(el.querySelector('st-segmented [aria-checked="true"]')?.textContent).toContain('All');
  });

  it('writes a search into the URL without adding history', async () => {
    const { el, harness, router } = await setup('?by=table');
    const navigate = vi.spyOn(router, 'navigate');
    const input = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'kam';
    input.dispatchEvent(new Event('input'));
    await settle(harness.fixture);
    expect(router.url).toContain('q=kam');
    expect(router.url).toContain('by=table');
    expect(navigate.mock.calls[0]?.[1]).toMatchObject({ replaceUrl: true, queryParamsHandling: 'merge' });
  });

  it('teaches the next step when nothing matches, and clears filters', async () => {
    const { el, button, harness, router, rows } = await setup('?q=zzzz&rsvp=declined');
    expect(el.textContent).toContain('No guests match this view');
    expect(el.textContent).toContain('see all 120 guests');
    button('Clear filters')!.click();
    await settle(harness.fixture);
    expect(router.url).not.toContain('q=');
    expect(rows().length).toBeGreaterThan(0);
  });

  it('shows the empty state for an event with no guests', async () => {
    const { el } = await setup('', { ...wedding(), guests: [], rules: [] });
    expect(el.textContent).toContain('No guests yet');
    expect(el.querySelector('a[href$="/import"]')).not.toBeNull();
  });

  it('runs a bulk RSVP change as one undoable command', async () => {
    const { rows, el, button, harness, store } = await setup('?rsvp=pending&sort=name:asc');
    const picked = rows().slice(0, 3);
    const ids = picked.map((r) => r.dataset['rowKey']!);
    for (const row of picked) row.querySelector<HTMLElement>('.select-cell')!.click();
    await settle(harness.fixture);
    expect(el.querySelector('st-bulk-bar')?.textContent).toContain('3 selected');

    button('Set RSVP')!.click();
    await settle(harness.fixture);
    button('Coming')!.click();
    await settle(harness.fixture);

    const rsvpOf = () => ids.map((id) => store.guestsById().get(id)?.rsvp);
    expect(rsvpOf()).toEqual(['accepted', 'accepted', 'accepted']);
    expect(TestBed.inject(ToastService).current()?.message).toBe('Set 3 guests to Coming');
    expect(store.undoLabel()).toBe('set 3 guests to Coming');

    TestBed.inject(Actions).undo();
    expect(rsvpOf()).toEqual(['pending', 'pending', 'pending']);
  });

  it('reports a refused table assignment and changes nothing', async () => {
    const { rows, button, harness, store, el } = await setup('?rsvp=pending');
    for (const row of rows().slice(0, 3)) row.querySelector<HTMLElement>('.select-cell')!.click();
    await settle(harness.fixture);
    button('Assign table')!.click();
    await settle(harness.fixture);
    const full = store.tables().find((t) => store.guests().filter((g) => g.seat?.tableId === t.id).length >= t.seats)!;
    const select = el.querySelector<HTMLSelectElement>('st-bulk-bar select')!;
    select.value = full.id;
    button('Assign')!.click();
    await settle(harness.fixture);
    expect(TestBed.inject(ToastService).current()).toMatchObject({ tone: 'danger', message: 'That table is full' });
    expect(store.canUndo()).toBe(false);
  });

  it('edits RSVP in the cell', async () => {
    const { el, harness, store } = await setup('?q=kamla');
    const select = el.querySelector<HTMLSelectElement>('select[aria-label="RSVP for Kamla Mehta"]')!;
    select.value = 'declined';
    select.dispatchEvent(new Event('change'));
    await settle(harness.fixture);
    expect(store.guests().find((g) => g.name === 'Kamla Mehta')?.rsvp).toBe('declined');
    expect(store.undoLabel()).toBe('set Kamla Mehta to Declined');
  });

  it('opens the guest panel on Enter', async () => {
    const { el, harness, router } = await setup('?q=kamla');
    const grid = el.querySelector<HTMLElement>('[role="grid"]')!;
    grid.focus();
    grid.dispatchEvent(new FocusEvent('focus'));
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(harness.fixture, 6);
    expect(router.url).toContain('guest=g-009');
    expect(document.querySelector('st-drawer [role="dialog"]')?.textContent).toContain('Kamla Mehta');
  });

  it('registers palette commands while open', async () => {
    const { harness } = await setup('');
    const labels = TestBed.inject(PaletteRegistry)
      .commands()
      .map((c) => c.label);
    expect(labels).toContain('Add a guest');
    expect(labels).toContain('Clear filters');
    expect(labels).toContain('Open Kamla Mehta');
    harness.fixture.destroy();
    expect(TestBed.inject(PaletteRegistry).commands()).toHaveLength(0);
  });

  it('renders only the rows in view for 1,000 guests', async () => {
    const { rows, el } = await setup('', bigWedding(1000));
    expect(el.querySelector('.summary')?.textContent).toContain('1,000 guests');
    expect(rows().length).toBeGreaterThan(0);
    expect(rows().length).toBeLessThan(60);
  });
});
