import { computed } from '@angular/core';
import { patchState, signalStoreFeature, type, withComputed, withMethods, withState } from '@ngrx/signals';

export interface HistoryEntry<D> {
  readonly label: string;
  readonly before: D;
  readonly after: D;
}

interface HistoryState<D> {
  past: readonly HistoryEntry<D>[];
  future: readonly HistoryEntry<D>[];
}

/**
 * Undo and redo for any store that keeps an immutable `doc`. Every change goes
 * through `commit(label, next)`, which records the before and after snapshots.
 * Snapshots share structure with each other, so a long history stays cheap.
 */
export function withHistory<D>(limit = 100) {
  return signalStoreFeature(
    { state: type<{ doc: D | null }>() },
    withState<HistoryState<D>>({ past: [], future: [] }),
    withComputed(({ past, future }) => ({
      canUndo: computed(() => past().length > 0),
      canRedo: computed(() => future().length > 0),
      undoLabel: computed(() => past().at(-1)?.label ?? null),
      redoLabel: computed(() => future()[0]?.label ?? null),
    })),
    withMethods((store) => ({
      /** Replace the doc and record the change. No-op when nothing changed. */
      commit(label: string, next: D): void {
        const before = store.doc();
        if (before === null || before === next) return;
        patchState(store, {
          doc: next,
          past: [...store.past(), { label, before, after: next }].slice(-limit),
          future: [],
        });
      },
      /** Returns the label of the change it reverted, for the toast. */
      undo(): string | null {
        const entry = store.past().at(-1);
        if (!entry) return null;
        patchState(store, { doc: entry.before, past: store.past().slice(0, -1), future: [entry, ...store.future()] });
        return entry.label;
      },
      redo(): string | null {
        const [entry, ...rest] = store.future();
        if (!entry) return null;
        patchState(store, { doc: entry.after, past: [...store.past(), entry], future: rest });
        return entry.label;
      },
      /** Load a doc without recording it, e.g. when opening another event. */
      reset(doc: D | null): void {
        patchState(store, { doc, past: [], future: [] });
      },
    })),
  );
}
