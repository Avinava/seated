import type { OpResult, SeatingEvent } from '@seated/domain';

/**
 * One user action. `label` is what undo and redo say ("Undo: seat the Mehtas");
 * `run` is a pure domain op, so the store can record the before and after
 * snapshots and every change is undoable the same way.
 */
export interface Command {
  readonly label: string;
  run(event: SeatingEvent): OpResult;
}

export function command(label: string, run: (event: SeatingEvent) => OpResult): Command {
  return { label, run };
}
