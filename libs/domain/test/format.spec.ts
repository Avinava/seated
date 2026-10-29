import { describe, expect, it } from 'vitest';
import {
  createSampleWedding,
  decodeShare,
  encodeShare,
  fromBase64Url,
  MIGRATIONS,
  parseExportFile,
  ShareDecodeError,
  toBase64Url,
  toExportFile,
  toSharePayload,
  validateEvent,
} from '../src';
import { event, guest, party, seated, table } from './support/builders';

const NOW = '2026-10-29T09:00:00.000Z';
const wedding = createSampleWedding(new Date(NOW));

describe('export file', () => {
  it('round-trips through JSON', () => {
    const file = toExportFile(wedding, NOW);
    expect(file).toMatchObject({ format: 'seated-export', version: 1, exportedAt: NOW });
    const parsed = parseExportFile(JSON.stringify(file));
    expect(parsed).toEqual({ ok: true, file, migratedFrom: null });
  });

  it('accepts already-parsed JSON', () => {
    expect(parseExportFile(toExportFile(wedding, NOW)).ok).toBe(true);
  });

  it.each<[string, unknown, string]>([
    ['not JSON', '{nope', 'invalid-json'],
    ['not an object', 42, 'wrong-format'],
    ['another format', { format: 'csv' }, 'wrong-format'],
    ['a future version', { format: 'seated-export', version: 9, event: {} }, 'unsupported-version'],
    ['a fractional version', { format: 'seated-export', version: 0.5 }, 'unsupported-version'],
  ])('rejects %s', (_, input, code) => {
    const r = parseExportFile(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.code).toBe(code);
  });

  it('reports typed, located errors for a broken event', () => {
    const broken = structuredClone(toExportFile(wedding, NOW)) as unknown as {
      exportedAt: unknown;
      event: Record<string, unknown> & { guests: Record<string, unknown>[]; rules: unknown[] };
    };
    broken.exportedAt = 5;
    broken.event['kind'] = 'party';
    const g0 = broken.event.guests[0] as Record<string, unknown>;
    g0['rsvp'] = 'maybe';
    g0['groupId'] = 'nope';
    g0['tags'] = [1];
    (broken.event.guests[1] as Record<string, unknown>)['id'] = g0['id'];
    broken.event.rules.push(
      { id: 'x', kind: 'apart', guests: ['g-001', 'ghost'] },
      { id: 'y', kind: 'apart', guests: 'g-001' },
    );
    const r = parseExportFile(broken);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual(
      expect.arrayContaining([
        { code: 'invalid-value', path: 'exportedAt', expected: 'string' },
        { code: 'invalid-value', path: 'event.kind', expected: 'one of wedding|birthday|office|conference|other' },
        { code: 'invalid-value', path: 'event.guests.0.rsvp', expected: 'one of accepted|pending|declined' },
        { code: 'unknown-reference', path: 'event.guests.0.groupId', expected: 'known id' },
        { code: 'invalid-value', path: 'event.guests.0.tags', expected: 'string[]' },
        { code: 'duplicate-id', path: 'event.guests.1.id', expected: 'unique id' },
        { code: 'unknown-reference', path: 'event.rules.4.guests.1', expected: 'known id' },
        { code: 'invalid-value', path: 'event.rules.5.guests', expected: 'pair of guest ids' },
      ]),
    );
  });

  it.each<[string, unknown, string]>([
    ['a non-object event', 'x', 'event'],
    ['a missing plan', { ...wedding, plan: null }, 'event.plan'],
    ['a non-array guest list', { ...wedding, guests: {} }, 'event.guests'],
    ['a non-object guest', { ...wedding, guests: [3] }, 'event.guests.0'],
    [
      'a bad seat',
      { ...wedding, guests: [{ ...wedding.guests[0], seat: { tableId: 'zz', index: 'a' } }] },
      'event.guests.0.seat.tableId',
    ],
    ['a bad zone', { ...wedding, plan: { ...wedding.plan, zones: [{ kind: 'pool' }] } }, 'event.plan.zones.0.kind'],
    ['a bad table', { ...wedding, tables: [{ ...wedding.tables[0], seats: '8' }] }, 'event.tables.0.seats'],
    ['an unknown rule kind', { ...wedding, rules: [{ id: 'r', kind: 'nearby' }] }, 'event.rules.0.kind'],
    [
      'a dangling together rule',
      { ...wedding, rules: [{ id: 'r', kind: 'together', partyId: 'zz' }] },
      'event.rules.0.partyId',
    ],
    [
      'a dangling near-exit rule',
      { ...wedding, rules: [{ id: 'r', kind: 'near-exit', guestId: 'zz' }] },
      'event.rules.0.guestId',
    ],
    [
      'a dangling plus-one',
      { ...wedding, guests: [{ ...wedding.guests[0], plusOneOf: 'zz' }] },
      'event.guests.0.plusOneOf',
    ],
  ])('validateEvent flags %s', (_, value, path) => {
    expect(validateEvent(value).map((e) => e.path)).toContain(path);
  });

  it('caps the error list', () => {
    const many = { ...wedding, guests: Array.from({ length: 100 }, () => ({})) };
    expect(validateEvent(many)).toHaveLength(50);
  });
});

describe('migrations', () => {
  // A version 0 file, as the first beta wrote it.
  const v0 = {
    format: 'seated-export',
    version: 0,
    exported: NOW,
    event: {
      id: 'e0',
      title: 'Old event',
      kind: 'birthday',
      when: '2026-05-01',
      venue: 'Hall',
      city: 'Pune',
      groups: [{ id: 'g1', label: 'Family', tone: 1 }],
      parties: [{ id: 'p1', label: 'The Raos' }],
      tables: [{ id: 't1', label: 'T1', shape: 'round', seats: 8, x: 100, y: 100, rotation: 0 }],
      plan: { width: 1180, height: 700, zones: [] },
      created: NOW,
      updated: NOW,
      guests: [
        {
          id: 'a',
          name: 'Asha',
          email: '',
          household: 'p1',
          group: 'g1',
          rsvp: 'accepted',
          meal: 'veg',
          diet: 'No nuts',
          tags: [],
          stepFree: true,
          notes: '',
          seat: { table: 't1', position: 3 },
        },
        {
          id: 'b',
          name: 'Bina',
          email: '',
          household: null,
          group: 'g1',
          rsvp: 'pending',
          meal: 'vegan',
          diet: '',
          tags: ['kids'],
          stepFree: false,
          notes: '',
          seat: null,
        },
      ],
    },
  };

  it('upgrades version 0 to the current shape', () => {
    const r = parseExportFile(v0);
    expect(r.ok && r.migratedFrom).toBe(0);
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.file.exportedAt).toBe(NOW);
    expect(r.file.event).toMatchObject({ name: 'Old event', date: '2026-05-01', createdAt: NOW, rules: [] });
    expect(r.file.event.guests[0]).toEqual({
      id: 'a',
      name: 'Asha',
      email: '',
      partyId: 'p1',
      groupId: 'g1',
      rsvp: 'accepted',
      meal: 'veg',
      dietary: 'No nuts',
      tags: [],
      access: true,
      plusOneOf: null,
      notes: '',
      seat: { tableId: 't1', index: 3 },
    });
  });

  it('treats a missing version as version 0, and the result round-trips', () => {
    const { version: _, ...unversioned } = v0;
    const r = parseExportFile(unversioned);
    if (!r.ok) throw new Error('expected ok');
    expect(parseExportFile(JSON.parse(JSON.stringify(r.file)))).toEqual({ ok: true, file: r.file, migratedFrom: null });
  });

  it('survives junk in a version 0 file and reports it', () => {
    const r = parseExportFile({ format: 'seated-export', version: 0, event: 'junk' });
    expect(r.ok).toBe(false);
    const r2 = parseExportFile({
      format: 'seated-export',
      version: 0,
      exported: NOW,
      event: { ...v0.event, guests: [7] },
    });
    expect(r2.ok).toBe(false);
  });

  it('has a step for every old version', () => {
    expect(MIGRATIONS.map((m) => m.from)).toEqual([0]);
  });
});

describe('share links', () => {
  const small = event({
    tables: [table('t1', { label: 'Head', shape: 'head' }), table('t2')],
    parties: [party('p1')],
    guests: [
      seated('a', 't1', 0, {
        name: 'Asha',
        email: 'asha@private.in',
        notes: 'secret',
        meal: 'jain',
        dietary: 'No nuts',
      }),
      guest('b', { name: 'Bina' }),
      seated('c', 'gone', 0, { name: 'Ghost' }),
    ],
  });

  it('carries only names, tables and seats', () => {
    expect(toSharePayload(small)).toEqual({
      v: 1,
      name: 'Test event',
      date: '2026-12-18',
      venue: 'Hall',
      city: 'Pune',
      tables: [
        { label: 'Head', shape: 'head', seats: 10 },
        { label: 'T2', shape: 'round', seats: 10 },
      ],
      guests: [{ name: 'Asha', table: 'Head', seat: 0 }],
    });
  });

  it.each([
    ['without seat counts, as older links were made', undefined, true],
    ['with a seat count', 10, true],
    ['with a broken seat count', 0, false],
  ])('reads a table %s', async (_, seats, valid) => {
    const payload = { ...toSharePayload(small), tables: [{ label: 'T1', shape: 'round', seats }] };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const packed = new Uint8Array(
      await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer(),
    );
    const result = await decodeShare(toBase64Url(new Uint8Array([1, ...packed]))).then(
      (p) => p.tables[0]?.seats,
      (e: unknown) => (e as ShareDecodeError).code,
    );
    expect(result).toBe(valid ? seats : 'invalid-payload');
  });

  it('round-trips the sample wedding without private fields', async () => {
    const token = await encodeShare(wedding);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    const payload = await decodeShare(token);
    expect(payload).toEqual(toSharePayload(wedding));
    expect(payload.guests).toHaveLength(84);
    const text = JSON.stringify(payload);
    for (const g of wedding.guests) {
      if (g.email) expect(text).not.toContain(g.email);
      if (g.notes) expect(text).not.toContain(g.notes);
    }
    for (const key of ['email', 'meal', 'dietary', 'notes', 'rsvp', 'tags', 'access', 'id']) {
      expect(text).not.toContain(`"${key}"`);
    }
    // Compression keeps links short.
    expect(token.length).toBeLessThan(JSON.stringify(payload).length / 2);
  });

  it.each([
    ['not base64url', '***', 'bad-encoding'],
    ['too short', 'AQ', 'bad-encoding'],
    ['another version', toBase64Url(new Uint8Array([9, 1, 2])), 'unsupported-version'],
    ['corrupt data', toBase64Url(new Uint8Array([1, 255, 255, 255])), 'corrupt'],
    ['bad padding', 'A', 'bad-encoding'],
  ])('rejects %s', async (_, token, code) => {
    await expect(decodeShare(token)).rejects.toMatchObject({ name: 'ShareDecodeError', code });
  });

  it('rejects a well-formed token with the wrong payload', async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, name: 'x' }));
    const packed = new Uint8Array(
      await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer(),
    );
    const token = toBase64Url(new Uint8Array([1, ...packed]));
    const err = await decodeShare(token).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ShareDecodeError);
    expect((err as ShareDecodeError).code).toBe('invalid-payload');
  });

  it.each([
    [{}, undefined],
    [{ tablemates: true }, undefined],
    [{ tablemates: false }, false],
  ])('carries the tablemates choice %j', async (options, expected) => {
    expect(toSharePayload(small, options).tablemates).toBe(expected);
    expect((await decodeShare(await encodeShare(small, options))).tablemates).toBe(expected);
  });

  it('rejects a tablemates flag that is not a boolean', async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ ...toSharePayload(small), tablemates: 'no' }));
    const packed = new Uint8Array(
      await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer(),
    );
    const err = await decodeShare(toBase64Url(new Uint8Array([1, ...packed]))).catch((e: unknown) => e);
    expect((err as ShareDecodeError).code).toBe('invalid-payload');
  });

  it('base64url round-trips every byte', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
  });
});
