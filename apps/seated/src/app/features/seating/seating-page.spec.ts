import { DeferBlockBehavior, DeferBlockState, TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { createSampleWedding, type SeatRef, type SeatingEvent } from '@seated/domain';
import { CLOCK } from '../../core/clock';
import { EventRepository } from '../../core/storage/event-repository';
import { MemoryRepository } from '../../core/storage/memory-repository';
import { EventStore } from '../../state/event-store';
import SeatingPage from './seating-page';
import { dropPreview, partyPayload, unseatedGroups } from './seating.vm';

describe('SeatingPage', () => {
  const now = new Date('2026-10-29T10:00:00Z');
  let wedding: SeatingEvent;
  let store: EventStore;
  let fixture: ComponentFixture<SeatingPage>;
  let root: HTMLElement;

  beforeEach(async () => {
    wedding = createSampleWedding(now);
    TestBed.configureTestingModule({
      imports: [SeatingPage],
      providers: [
        provideRouter([]),
        { provide: EventRepository, useValue: new MemoryRepository([wedding]) },
        { provide: CLOCK, useValue: () => now },
      ],
      deferBlockBehavior: DeferBlockBehavior.Manual,
    });
    store = TestBed.inject(EventStore);
    await store.open(wedding.id);
    fixture = TestBed.createComponent(SeatingPage);
    await fixture.whenStable();
    const [plan] = await fixture.getDeferBlocks();
    await plan!.render(DeferBlockState.Complete);
    await fixture.whenStable();
    root = fixture.nativeElement as HTMLElement;
  });

  const settle = () => fixture.whenStable();
  const seatEl = (seat: SeatRef) =>
    root.querySelector<HTMLButtonElement>(
      `st-table[data-table-id="${seat.tableId}"] [data-seat-index="${seat.index}"]`,
    )!;
  const holdingBar = () => root.querySelector('.holding');
  const guest = (id: string) => store.guestsById().get(id)!;
  const key = (target: EventTarget, k: string) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

  /** The first seat where the whole party fits, found with the same dry run the screen uses. */
  function seatFor(guestIds: readonly string[], label: string): SeatRef {
    const doc = store.doc()!;
    for (const t of doc.tables) {
      for (let index = 0; index < t.seats; index++) {
        const seat = { tableId: t.id, index };
        if (dropPreview(doc, { guestIds, label, from: null }, seat).ok) return seat;
      }
    }
    throw new Error('no room anywhere');
  }

  it('renders the plan with every table as a named group in reading order', () => {
    const tables = Array.from(root.querySelectorAll('st-table'));
    expect(tables).toHaveLength(wedding.tables.length);
    expect(tables[0]?.getAttribute('aria-label')).toBe('Head table, 8 of 8 seated');
    expect(root.querySelector('st-floor')?.getAttribute('aria-label')).toContain('Floor plan');
  });

  it('picks a party up with the keyboard, drops it on a seat, and undoes it', async () => {
    const party = unseatedGroups(store.doc()!, '').find((g) => g.members.length > 1 && !g.pending)!;
    const ids = party.members.map((m) => m.id);
    const header = Array.from(root.querySelectorAll<HTMLButtonElement>('button.party')).find((b) =>
      b.textContent?.includes(party.label),
    )!;

    header.click(); // Enter or Space on a native button
    await settle();
    expect(header.getAttribute('aria-pressed')).toBe('true');
    expect(holdingBar()?.textContent).toContain(partyPayload(party).label);

    const target = seatFor(ids, party.label);
    seatEl(target).focus();
    await settle();
    expect(seatEl(target).dataset['state']).toBe('drop-target');

    seatEl(target).click();
    await settle();
    expect(ids.every((id) => guest(id).seat?.tableId === target.tableId)).toBe(true);
    expect(guest(ids[0]!).seat).toEqual(target);
    expect(holdingBar()).toBeNull();
    expect(seatEl(target).classList).toContain('is-placed');
    expect(store.undoLabel()).toBe(
      `seat ${partyPayload(party).label} at ${store.tablesById().get(target.tableId)!.label}`,
    );

    root.querySelector<HTMLButtonElement>('button[aria-label^="Undo seat"]')!.click();
    await settle();
    expect(ids.every((id) => guest(id).seat === null)).toBe(true);
  });

  it('cancels a hold with Escape and leaves everything in place', async () => {
    const before = store.doc();
    const row = root.querySelector<HTMLButtonElement>('button.guest')!;
    row.click();
    await settle();
    expect(holdingBar()).not.toBeNull();

    key(document.body, 'Escape');
    await settle();
    expect(holdingBar()).toBeNull();
    expect(row.getAttribute('aria-pressed')).toBe('false');
    expect(store.doc()).toBe(before);
  });

  it('moves a seated guest to another seat by picking them up from their seat', async () => {
    const mover = store.guests().find((g) => g.seat?.tableId === 't-2')!;
    const target = seatFor([mover.id], mover.name);
    seatEl(mover.seat!).click();
    await settle();
    expect(seatEl(mover.seat!).dataset['state']).toBe('picked');
    seatEl(target).click();
    await settle();
    expect(guest(mover.id).seat).toEqual(target);
  });

  it('unseats a guest with Delete on their seat', async () => {
    const seated = store.guests().find((g) => g.seat?.tableId === 't-2')!;
    const el = seatEl(seated.seat!);
    el.focus();
    key(el, 'Delete');
    await settle();
    expect(guest(seated.id).seat).toBeNull();
    expect(store.undoLabel()).toBe(`unseat ${seated.name}`);
    expect(seatEl(seated.seat!).dataset['state']).toBe('empty');
  });

  it('nudges a table with the arrow keys as one undo step', async () => {
    const top = root.querySelector<HTMLButtonElement>('st-table[data-table-id="t-1"] button.top')!;
    const start = store.tablesById().get('t-1')!;
    key(top, 'ArrowLeft');
    key(top, 'ArrowLeft');
    key(top, 'ArrowUp');
    await settle();
    expect(store.tablesById().get('t-1')).toMatchObject({ x: start.x - 20, y: start.y - 10 });
    store.undo();
    expect(store.tablesById().get('t-1')).toMatchObject({ x: start.x, y: start.y });
  });

  it('runs auto-seat as one command and shows the summary', async () => {
    const seatedBefore = store.seatedCount();
    root.querySelector<HTMLButtonElement>('button.auto')!.click();
    await settle();
    const summary = root.querySelector('.summary')!;
    expect(summary.getAttribute('role')).toBe('status');
    expect(summary.querySelector('h3')?.textContent).toMatch(/^Auto-seated \d+ guests$/);
    expect(summary.querySelectorAll('.placed li').length).toBeGreaterThan(0);
    expect(store.seatedCount()).toBeGreaterThan(seatedBefore);
    expect(store.undoLabel()).toMatch(/^auto-seat \d+ guests$/);

    store.undo();
    expect(store.seatedCount()).toBe(seatedBefore);
  });

  it('marks the seats and table of a rule conflict, and the rule selects them', async () => {
    const report = store.report()!;
    const [conflict] = report.conflicts;
    expect(conflict).toBeDefined();
    for (const id of conflict!.guestIds) expect(seatEl(guest(id).seat!).dataset['state']).toBe('conflict');
    const tableId = guest(conflict!.guestIds[0]!).seat!.tableId;
    const tableEl = root.querySelector(`st-table[data-table-id="${tableId}"]`)!;
    expect(tableEl.classList).toContain('is-conflict');
    expect(tableEl.getAttribute('aria-label')).toContain('1 conflict');

    const rule = root.querySelector<HTMLButtonElement>('.rule[data-status="conflict"] button.main')!;
    rule.click();
    await settle();
    expect(rule.getAttribute('aria-pressed')).toBe('true');
    expect(tableEl.classList).toContain('is-selected');
    expect(root.querySelector('st-table-details h2')?.textContent).toContain('Table');
  });
});
