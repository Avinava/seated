import { computed, effect, inject, untracked } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import {
  byId,
  evaluate,
  seatedCount,
  touch,
  unseated,
  type EventId,
  type OpResult,
  type SeatingEvent,
} from '@seated/domain';
import { CLOCK } from '../core/clock';
import { withHistory } from '../core/history/with-history';
import { EventRepository } from '../core/storage/event-repository';
import type { Command } from './command';
import { SampleSeed } from './sample-seed';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'missing';
type SaveStatus = 'saved' | 'saving' | 'error';

interface EventState {
  /** The open event. Named `doc` because the history feature works on any document. */
  doc: SeatingEvent | null;
  status: LoadStatus;
  save: SaveStatus;
}

/**
 * The open event and its history. Every change is a `Command` run through
 * `execute`; the store applies it optimistically, records it for undo and
 * writes it to storage in the background.
 */
export const EventStore = signalStore(
  { providedIn: 'root' },
  withState<EventState>({ doc: null, status: 'idle', save: 'saved' }),
  withHistory<SeatingEvent>(),
  withComputed(({ doc }) => {
    const guests = computed(() => doc()?.guests ?? []);
    return {
      guests,
      tables: computed(() => doc()?.tables ?? []),
      groups: computed(() => doc()?.groups ?? []),
      report: computed(() => {
        const d = doc();
        return d ? evaluate(d) : null;
      }),
      guestsById: computed(() => byId(guests())),
      tablesById: computed(() => byId(doc()?.tables ?? [])),
      groupsById: computed(() => byId(doc()?.groups ?? [])),
      partiesById: computed(() => byId(doc()?.parties ?? [])),
      unseated: computed(() => unseated(guests())),
      seatedCount: computed(() => seatedCount(guests())),
      comingCount: computed(() => guests().filter((g) => g.rsvp === 'accepted').length),
    };
  }),
  withMethods((store, repo = inject(EventRepository), clock = inject(CLOCK), seed = inject(SampleSeed)) => ({
    /** Load an event. `reload` reads it again even when it is already open, e.g. after restoring a file. */
    async open(id: EventId, { reload = false }: { reload?: boolean } = {}): Promise<void> {
      if (!reload && store.doc()?.id === id) return;
      patchState(store, { status: 'loading' });
      await seed.ready();
      const event = await repo.get(id);
      store.reset(event ?? null);
      patchState(store, { status: event ? 'ready' : 'missing' });
    },

    /** Apply a command. On failure nothing changes and the typed reason comes back for the UI. */
    execute(cmd: Command): OpResult {
      const doc = store.doc();
      if (!doc) return { ok: false, reason: 'not-found', ids: [] };
      const result = cmd.run(doc);
      if (result.ok) store.commit(cmd.label, touch(result.event, clock().toISOString()));
      return result;
    },
  })),
  withHooks({
    onInit(store, repo = inject(EventRepository)) {
      // Persist every change after it shows. Saves are serialised so the last one wins.
      let queue = Promise.resolve();
      effect(() => {
        const doc = store.doc();
        if (!doc || untracked(store.status) !== 'ready') return;
        patchState(store, { save: 'saving' });
        queue = queue
          .then(() => repo.put(doc))
          .then(
            () => {
              if (store.doc() === doc) patchState(store, { save: 'saved' });
            },
            () => patchState(store, { save: 'error' }),
          );
      });
    },
  }),
);

export type EventStore = InstanceType<typeof EventStore>;
