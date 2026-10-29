import type { SeatingEvent, Table, TableId, TableShape } from '../model/types';
import { nextIdFor } from './ids';
import { findTable, mapGuests } from './internal';
import { invalid, notFound, ok, type OpResult } from './result';

export const TABLE_SEATS = { min: 1, max: 30 } as const;

export interface TableDraft {
  readonly shape: TableShape;
  readonly seats: number;
  readonly x: number;
  readonly y: number;
  readonly rotation?: 0 | 90;
  /** Defaults to the next free "T<n>" label. */
  readonly label?: string;
}

function validSeats(seats: number): boolean {
  return Number.isInteger(seats) && seats >= TABLE_SEATS.min && seats <= TABLE_SEATS.max;
}

/** Keep a table centre inside the floor plan. */
function clampToPlan(event: SeatingEvent, x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x, 0), event.plan.width),
    y: Math.min(Math.max(y, 0), event.plan.height),
  };
}

export function nextTableLabel(tables: readonly Table[]): string {
  let max = 0;
  for (const t of tables) {
    const m = /^T(\d+)$/.exec(t.label);
    if (m?.[1] !== undefined) max = Math.max(max, Number(m[1]));
  }
  return `T${max + 1}`;
}

export function addTable(event: SeatingEvent, draft: TableDraft): OpResult<{ readonly id: TableId }> {
  if (!validSeats(draft.seats)) return invalid('seats');
  if (!Number.isFinite(draft.x) || !Number.isFinite(draft.y)) return invalid('position');
  const label = draft.label?.trim() || nextTableLabel(event.tables);
  const id = nextIdFor('table', event.tables);
  const table: Table = {
    id,
    label,
    shape: draft.shape,
    seats: draft.seats,
    rotation: draft.rotation ?? 0,
    ...clampToPlan(event, draft.x, draft.y),
  };
  return ok({ ...event, tables: [...event.tables, table] }, { id });
}

function patchTable(event: SeatingEvent, tableId: TableId, fn: (t: Table) => Table): SeatingEvent {
  return { ...event, tables: event.tables.map((t) => (t.id === tableId ? fn(t) : t)) };
}

export function moveTable(event: SeatingEvent, tableId: TableId, x: number, y: number): OpResult {
  if (!findTable(event, tableId)) return notFound([tableId]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return invalid('position');
  return ok(patchTable(event, tableId, (t) => ({ ...t, ...clampToPlan(event, x, y) })));
}

/** Change the seat count. Guests on seats that no longer exist become unseated. */
export function resizeTable(event: SeatingEvent, tableId: TableId, seats: number): OpResult {
  if (!findTable(event, tableId)) return notFound([tableId]);
  if (!validSeats(seats)) return invalid('seats');
  const resized = patchTable(event, tableId, (t) => ({ ...t, seats }));
  return ok(
    mapGuests(resized, (g) => (g.seat?.tableId === tableId && g.seat.index >= seats ? { ...g, seat: null } : g)),
  );
}

/** Turn a table to `rotation`, or toggle between 0 and 90 when omitted. */
export function rotateTable(event: SeatingEvent, tableId: TableId, rotation?: 0 | 90): OpResult {
  const table = findTable(event, tableId);
  if (!table) return notFound([tableId]);
  const next = rotation ?? (table.rotation === 0 ? 90 : 0);
  return ok(patchTable(event, tableId, (t) => ({ ...t, rotation: next })));
}

export function renameTable(event: SeatingEvent, tableId: TableId, label: string): OpResult {
  if (!findTable(event, tableId)) return notFound([tableId]);
  if (label.trim() === '') return invalid('label');
  return ok(patchTable(event, tableId, (t) => ({ ...t, label: label.trim() })));
}

/** Remove a table; its guests become unseated. */
export function removeTable(event: SeatingEvent, tableId: TableId): OpResult {
  if (!findTable(event, tableId)) return notFound([tableId]);
  const without = { ...event, tables: event.tables.filter((t) => t.id !== tableId) };
  return ok(mapGuests(without, (g) => (g.seat?.tableId === tableId ? { ...g, seat: null } : g)));
}
