import type { SeatingEvent } from '../model/types';
import { isObject, validateEvent, type FormatError } from './validate';

export const EXPORT_FORMAT = 'seated-export';
export const EXPORT_VERSION = 1;

export interface ExportFile {
  readonly format: typeof EXPORT_FORMAT;
  readonly version: typeof EXPORT_VERSION;
  readonly exportedAt: string;
  readonly event: SeatingEvent;
}

export function toExportFile(event: SeatingEvent, exportedAt: string): ExportFile {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt, event };
}

type Raw = Record<string, unknown>;

function rename(o: Raw, from: string, to: string): Raw {
  if (!(from in o)) return o;
  const { [from]: value, ...rest } = o;
  return { ...rest, [to]: value };
}

function migrateGuestV0(g: unknown): unknown {
  if (!isObject(g)) return g;
  let out = rename(
    rename(rename(rename(g, 'household', 'partyId'), 'group', 'groupId'), 'diet', 'dietary'),
    'stepFree',
    'access',
  );
  const seat = out['seat'];
  if (isObject(seat)) out = { ...out, seat: { tableId: seat['table'], index: seat['position'] } };
  return { plusOneOf: null, ...out };
}

/**
 * Each entry upgrades a file from `from` to `from + 1`. Version 0 (the first
 * beta) used `title`, `when`, `created`/`updated` and `exported`, stored seats
 * as { table, position }, called a few guest fields by other names, and had
 * no rules or plus-ones.
 */
export const MIGRATIONS: readonly { readonly from: number; readonly migrate: (file: Raw) => Raw }[] = [
  {
    from: 0,
    migrate: (file) => {
      const raw = isObject(file['event']) ? file['event'] : {};
      let event = rename(
        rename(rename(rename(raw, 'title', 'name'), 'when', 'date'), 'created', 'createdAt'),
        'updated',
        'updatedAt',
      );
      event = {
        rules: [],
        ...event,
        guests: Array.isArray(event['guests']) ? event['guests'].map(migrateGuestV0) : event['guests'],
      };
      return { ...rename(file, 'exported', 'exportedAt'), version: 1, event };
    },
  },
];

export type ParseExportResult =
  | { readonly ok: true; readonly file: ExportFile; readonly migratedFrom: number | null }
  | { readonly ok: false; readonly errors: readonly FormatError[] };

/** Read an export file (parsed JSON or the raw text), upgrading older versions. */
export function parseExportFile(input: unknown): ParseExportResult {
  let json = input;
  if (typeof input === 'string') {
    try {
      json = JSON.parse(input);
    } catch {
      return { ok: false, errors: [{ code: 'invalid-json', path: '' }] };
    }
  }
  if (!isObject(json) || json['format'] !== EXPORT_FORMAT) {
    return { ok: false, errors: [{ code: 'wrong-format', path: 'format', expected: EXPORT_FORMAT }] };
  }
  const start = json['version'] ?? 0;
  if (typeof start !== 'number' || !Number.isInteger(start) || start < 0 || start > EXPORT_VERSION) {
    return { ok: false, errors: [{ code: 'unsupported-version', path: 'version', expected: `<= ${EXPORT_VERSION}` }] };
  }
  let file: Raw = json;
  for (let v = start; v < EXPORT_VERSION; v++) {
    const step = MIGRATIONS.find((m) => m.from === v);
    if (!step) return { ok: false, errors: [{ code: 'unsupported-version', path: 'version' }] };
    file = step.migrate(file);
  }
  const errors: FormatError[] = [];
  if (typeof file['exportedAt'] !== 'string')
    errors.push({ code: 'invalid-value', path: 'exportedAt', expected: 'string' });
  errors.push(...validateEvent(file['event']));
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, file: file as unknown as ExportFile, migratedFrom: start === EXPORT_VERSION ? null : start };
}
