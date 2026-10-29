import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { createSampleEvents, toExportFile, type SeatingEvent } from '@seated/domain';
import { ToastService } from '@seated/kit';
import { CLOCK } from '../../core/clock';
import { EventRepository } from '../../core/storage/event-repository';
import { MemoryRepository } from '../../core/storage/memory-repository';
import { EventsStore } from '../../state/events-store';
import { SampleSeed } from '../../state/sample-seed';
import { NOW, layoutFreeInteractivity, settle } from '../guests/testing';
import EventsPage from './events-page';

describe('EventsPage', () => {
  async function setup(events: SeatingEvent[], load = true) {
    const repo = new MemoryRepository(events);
    TestBed.configureTestingModule({
      providers: [
        { provide: EventRepository, useValue: repo },
        { provide: CLOCK, useValue: () => NOW },
        // No sample seeding: each test decides what is on the device.
        { provide: SampleSeed, useValue: { ready: () => Promise.resolve() } },
        provideRouter([
          { path: '', component: EventsPage },
          { path: 'events/:eventId/:screen', children: [] },
        ]),
        layoutFreeInteractivity,
      ],
    });
    const store = TestBed.inject(EventsStore);
    if (load) await store.load();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/', EventsPage);
    await settle(harness.fixture);
    const el = harness.routeNativeElement as HTMLElement;
    const button = (text: string) =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text);
    return { harness, el, store, repo, button, router: TestBed.inject(Router) };
  }

  it('shows one card per event, soonest first, each a single named link', async () => {
    const { el } = await setup(createSampleEvents(NOW));
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('.card a'));
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      "Meera's 30th",
      "Ananya & Kabir's wedding",
      'Kestrel annual dinner',
    ]);
    expect(links[1]?.getAttribute('href')).toBe('/events/ev-wedding/seating');
    const meta = document.getElementById(links[1]!.getAttribute('aria-describedby')!);
    expect(meta?.textContent).toContain('Fri 18 Dec 2026');
    expect(meta?.textContent).toContain('in 50 days');
    expect(el.querySelectorAll('.card button, .card a').length).toBe(3);
    expect(el.textContent).toContain('84 of 100');
    expect(el.textContent).toContain('Start from a template');
  });

  it('shows skeleton cards while loading', async () => {
    const { el } = await setup([], false);
    expect(el.querySelector('[aria-busy="true"] st-skeleton')).not.toBeNull();
    expect(el.textContent).not.toContain('Plan your first event');
  });

  it('welcomes a first-time visitor', async () => {
    const { el } = await setup([]);
    expect(el.querySelector('h1')?.textContent).toBe('Plan your first event');
    expect(el.textContent).toContain('No account · Works offline · Export any time');
  });

  it('creates an event from a template and opens its guest list', async () => {
    const { button, harness, router, store } = await setup([]);
    button('Office dinner')!.click();
    await settle(harness.fixture);
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.querySelector<HTMLSelectElement>('select')!.value).toBe('office');

    button('Create event')!.click();
    await settle(harness.fixture);
    expect(dialog.textContent).toContain('Give the event a name');
    expect(dialog.textContent).toContain('Pick a date');

    const [name, date] = Array.from(dialog.querySelectorAll<HTMLInputElement>('input'));
    name!.value = 'Kestrel offsite';
    name!.dispatchEvent(new Event('input'));
    date!.value = '2026-10-01';
    date!.dispatchEvent(new Event('input'));
    await settle(harness.fixture);
    expect(dialog.textContent).toContain('Pick today or a later date');

    date!.value = '2026-12-04';
    date!.dispatchEvent(new Event('input'));
    button('Create event')!.click();
    await settle(harness.fixture, 6);
    expect(store.events().map((e) => e.name)).toEqual(['Kestrel offsite']);
    expect(router.url).toBe(`/events/${store.events()[0]!.id}/guests`);
  });

  it('opens an export file, and explains a bad one', async () => {
    const { el, harness, router, store } = await setup(createSampleEvents(NOW).slice(1));
    const input = el.querySelector<HTMLInputElement>('input[type="file"]')!;
    const pick = async (text: string) => {
      Object.defineProperty(input, 'files', { value: [new File([text], 'x.json')], configurable: true });
      input.dispatchEvent(new Event('change'));
      await settle(harness.fixture, 6);
    };

    await pick('{ nope');
    expect(TestBed.inject(ToastService).current()).toMatchObject({ tone: 'danger' });
    expect(TestBed.inject(ToastService).current()?.message).toContain('not readable JSON');

    const wedding = createSampleEvents(NOW)[0]!;
    await pick(JSON.stringify(toExportFile(wedding, NOW.toISOString())));
    expect(store.events().some((e) => e.id === wedding.id)).toBe(true);
    expect(router.url).toBe('/events/ev-wedding/seating');
  });
});
