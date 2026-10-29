import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { type EventId, type EventKind, type FormatError, type SeatingEvent } from '@seated/domain';
import { CLOCK } from '../core/clock';
import { EventRepository } from '../core/storage/event-repository';
import { SampleSeed } from './sample-seed';

interface EventsState {
  events: SeatingEvent[];
  status: 'idle' | 'loading' | 'ready';
}

// Templates, sample data and the export-file validator load on demand, keeping them out of the first download.
/** The list of events on this device, for the home screen and the event switcher. */
export const EventsStore = signalStore(
  { providedIn: 'root' },
  withState<EventsState>({ events: [], status: 'idle' }),
  withComputed(({ events }) => ({
    /** Soonest first. */
    sorted: computed(() => [...events()].sort((a, b) => a.date.localeCompare(b.date))),
  })),
  withMethods((store, repo = inject(EventRepository), clock = inject(CLOCK), seed = inject(SampleSeed)) => {
    const now = () => clock();
    return {
      async load(): Promise<void> {
        if (store.status() === 'loading') return;
        patchState(store, { status: store.events().length ? 'ready' : 'loading' });
        await seed.ready();
        patchState(store, { events: await repo.list(), status: 'ready' });
      },

      async create(kind: EventKind, name: string, date: string): Promise<SeatingEvent> {
        const id = `e-${now().getTime().toString(36)}`;
        const { createFromTemplate } = await import('@seated/domain/sample');
        const event = createFromTemplate(kind, name, date, now(), id);
        await repo.put(event);
        patchState(store, { events: [...store.events(), event] });
        return event;
      },

      async remove(id: EventId): Promise<void> {
        await repo.delete(id);
        patchState(store, { events: store.events().filter((e) => e.id !== id) });
      },

      /** Import an export file. A file for an event already here replaces it. */
      async importFile(
        text: string,
      ): Promise<{ ok: true; event: SeatingEvent } | { ok: false; errors: FormatError[] }> {
        const { parseExportFile } = await import('@seated/domain/format');
        const parsed = parseExportFile(text);
        if (!parsed.ok) return { ok: false, errors: [...parsed.errors] };
        const event = parsed.file.event;
        await repo.put(event);
        patchState(store, { events: [...store.events().filter((e) => e.id !== event.id), event] });
        return { ok: true, event };
      },

      /** Keep the list in step after the open event changes. */
      sync(event: SeatingEvent): void {
        if (!store.events().some((e) => e.id === event.id)) return;
        patchState(store, { events: store.events().map((e) => (e.id === event.id ? event : e)) });
      },
    };
  }),
);
