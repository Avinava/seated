import { TestBed } from '@angular/core/testing';
import { createSampleWedding, setRsvp, unseatGuests, type SeatingEvent } from '@seated/domain';
import { CLOCK } from '../core/clock';
import { EventRepository } from '../core/storage/event-repository';
import { MemoryRepository } from '../core/storage/memory-repository';
import { command } from './command';
import { EventStore } from './event-store';

describe('EventStore', () => {
  const now = new Date('2026-10-29T10:00:00Z');
  let wedding: SeatingEvent;
  let repo: MemoryRepository;
  let store: EventStore;

  beforeEach(async () => {
    wedding = createSampleWedding(now);
    repo = new MemoryRepository([wedding]);
    TestBed.configureTestingModule({
      providers: [
        { provide: EventRepository, useValue: repo },
        { provide: CLOCK, useValue: () => now },
      ],
    });
    store = TestBed.inject(EventStore);
    await store.open(wedding.id);
  });

  it('opens an event and derives counts and the rule report', () => {
    expect(store.status()).toBe('ready');
    expect(store.guests()).toHaveLength(120);
    expect(store.seatedCount()).toBe(84);
    expect(store.report()?.counts.conflict).toBe(1);
  });

  it('marks a missing event', async () => {
    await store.open('nope');
    expect(store.status()).toBe('missing');
    expect(store.doc()).toBeNull();
  });

  it('runs a command, stamps the time and makes it undoable', () => {
    const seated = store.guests().find((g) => g.seat)!;
    const result = store.execute(command('Unseat', (e) => unseatGuests(e, [seated.id])));
    expect(result.ok).toBe(true);
    expect(store.seatedCount()).toBe(83);
    expect(store.doc()?.updatedAt).toBe(now.toISOString());
    expect(store.undo()).toBe('Unseat');
    expect(store.seatedCount()).toBe(84);
  });

  it('leaves everything alone when a command fails', () => {
    const before = store.doc();
    const result = store.execute(command('Bad', (e) => setRsvp(e, ['nobody'], 'accepted')));
    expect(result.ok).toBe(false);
    expect(store.doc()).toBe(before);
    expect(store.canUndo()).toBe(false);
  });

  it('saves changes to the repository', async () => {
    const seated = store.guests().find((g) => g.seat)!;
    store.execute(command('Unseat', (e) => unseatGuests(e, [seated.id])));
    TestBed.tick();
    await vi.waitFor(async () => {
      expect((await repo.get(wedding.id))?.guests.find((g) => g.id === seated.id)?.seat).toBeNull();
    });
    expect(store.save()).toBe('saved');
  });
});
