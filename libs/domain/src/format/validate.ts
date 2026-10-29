import { MEALS, RSVPS, type SeatingEvent } from '../model/types';

export type FormatErrorCode =
  'invalid-json' | 'wrong-format' | 'unsupported-version' | 'invalid-value' | 'unknown-reference' | 'duplicate-id';

export interface FormatError {
  readonly code: FormatErrorCode;
  /** Dotted path to the offending value, e.g. "event.guests.3.rsvp". */
  readonly path: string;
  /** What was expected there, e.g. "string" or "one of accepted|pending|declined". */
  readonly expected?: string;
}

const MAX_ERRORS = 50;

type Obj = Record<string, unknown>;

export function isObject(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

class Checker {
  readonly errors: FormatError[] = [];

  fail(path: string, expected: string, code: FormatErrorCode = 'invalid-value'): false {
    if (this.errors.length < MAX_ERRORS) this.errors.push({ code, path, expected });
    return false;
  }

  obj(v: unknown, path: string): v is Obj {
    return isObject(v) || this.fail(path, 'object');
  }

  arr(v: unknown, path: string): v is unknown[] {
    return Array.isArray(v) || this.fail(path, 'array');
  }

  str(o: Obj, k: string, path: string): boolean {
    return typeof o[k] === 'string' || this.fail(`${path}.${k}`, 'string');
  }

  num(o: Obj, k: string, path: string): boolean {
    const v = o[k];
    return (typeof v === 'number' && Number.isFinite(v)) || this.fail(`${path}.${k}`, 'number');
  }

  bool(o: Obj, k: string, path: string): boolean {
    return typeof o[k] === 'boolean' || this.fail(`${path}.${k}`, 'boolean');
  }

  oneOf(o: Obj, k: string, path: string, options: readonly unknown[]): boolean {
    return options.includes(o[k]) || this.fail(`${path}.${k}`, `one of ${options.join('|')}`);
  }

  ref(o: Obj, k: string, path: string, ids: ReadonlySet<unknown>, nullable = false): boolean {
    const v = o[k];
    if (nullable && v === null) return true;
    return ids.has(v) || this.fail(`${path}.${k}`, 'known id', 'unknown-reference');
  }

  /** Validate each item of an array and collect its ids. */
  list(o: Obj, k: string, path: string, each: (item: Obj, path: string) => void): Set<unknown> {
    const ids = new Set<unknown>();
    const v = o[k];
    if (!this.arr(v, `${path}.${k}`)) return ids;
    v.forEach((item, i) => {
      const p = `${path}.${k}.${i}`;
      if (!this.obj(item, p)) return;
      if (typeof item['id'] === 'string') {
        if (ids.has(item['id'])) this.fail(`${p}.id`, 'unique id', 'duplicate-id');
        ids.add(item['id']);
      }
      each(item, p);
    });
    return ids;
  }
}

/** Structural and referential check of a current-version event. */
export function validateEvent(value: unknown, path = 'event'): FormatError[] {
  const c = new Checker();
  if (!c.obj(value, path)) return c.errors;
  const e = value;
  for (const k of ['id', 'name', 'date', 'venue', 'city', 'createdAt', 'updatedAt']) c.str(e, k, path);
  c.oneOf(e, 'kind', path, ['wedding', 'birthday', 'office', 'conference', 'other']);

  const groups = c.list(e, 'groups', path, (g, p) => {
    c.str(g, 'id', p);
    c.str(g, 'label', p);
    c.oneOf(g, 'tone', p, [1, 2, 3, 4]);
  });
  const parties = c.list(e, 'parties', path, (g, p) => {
    c.str(g, 'id', p);
    c.str(g, 'label', p);
  });
  const tables = c.list(e, 'tables', path, (t, p) => {
    for (const k of ['id', 'label']) c.str(t, k, p);
    c.oneOf(t, 'shape', p, ['round', 'long', 'head']);
    for (const k of ['seats', 'x', 'y']) c.num(t, k, p);
    c.oneOf(t, 'rotation', p, [0, 90]);
  });
  const guestItems: [Obj, string][] = [];
  const guests = c.list(e, 'guests', path, (g, p) => {
    for (const k of ['id', 'name', 'email', 'dietary', 'notes']) c.str(g, k, p);
    c.oneOf(g, 'rsvp', p, RSVPS);
    c.oneOf(g, 'meal', p, MEALS);
    c.bool(g, 'access', p);
    if (c.arr(g['tags'], `${p}.tags`) && !g['tags'].every((t) => typeof t === 'string')) {
      c.fail(`${p}.tags`, 'string[]');
    }
    c.ref(g, 'groupId', p, groups);
    c.ref(g, 'partyId', p, parties, true);
    const seat = g['seat'];
    if (seat !== null && c.obj(seat, `${p}.seat`)) {
      c.ref(seat, 'tableId', `${p}.seat`, tables);
      c.num(seat, 'index', `${p}.seat`);
    }
    guestItems.push([g, p]);
  });
  for (const [g, p] of guestItems) c.ref(g, 'plusOneOf', p, guests, true);

  c.list(e, 'rules', path, (r, p) => {
    c.str(r, 'id', p);
    if (!c.oneOf(r, 'kind', p, ['apart', 'together', 'near-exit'])) return;
    if (r['kind'] === 'apart') {
      const pair = r['guests'];
      if (!Array.isArray(pair) || pair.length !== 2) c.fail(`${p}.guests`, 'pair of guest ids');
      else
        pair.forEach((id: unknown, i) => {
          if (!guests.has(id)) c.fail(`${p}.guests.${i}`, 'known id', 'unknown-reference');
        });
    } else if (r['kind'] === 'together') {
      c.ref(r, 'partyId', p, parties);
    } else {
      c.ref(r, 'guestId', p, guests);
    }
  });

  const plan = e['plan'];
  if (c.obj(plan, `${path}.plan`)) {
    c.num(plan, 'width', `${path}.plan`);
    c.num(plan, 'height', `${path}.plan`);
    c.list(plan, 'zones', `${path}.plan`, (z, p) => {
      c.oneOf(z, 'kind', p, ['stage', 'bar', 'exit', 'entrance', 'dance-floor']);
      c.str(z, 'label', p);
      for (const k of ['x', 'y', 'w', 'h']) c.num(z, k, p);
    });
  }
  return c.errors;
}

export function asEvent(value: unknown): SeatingEvent | null {
  return validateEvent(value).length === 0 ? (value as SeatingEvent) : null;
}
