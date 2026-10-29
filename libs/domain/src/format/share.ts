import type { SeatingEvent, TableShape } from '../model/types';

export const SHARE_VERSION = 1;

/**
 * What a share link carries: enough to show who sits where, nothing private.
 * No emails, notes, meals, dietary needs, RSVPs or unseated guests.
 */
export interface SharePayload {
  readonly v: typeof SHARE_VERSION;
  readonly name: string;
  readonly date: string;
  readonly venue: string;
  readonly city: string;
  readonly tables: readonly { readonly label: string; readonly shape: TableShape }[];
  readonly guests: readonly { readonly name: string; readonly table: string; readonly seat: number }[];
}

export type ShareErrorCode = 'bad-encoding' | 'unsupported-version' | 'corrupt' | 'invalid-payload';

export class ShareDecodeError extends Error {
  constructor(readonly code: ShareErrorCode) {
    super(`share-${code}`);
    this.name = 'ShareDecodeError';
  }
}

export function toSharePayload(event: SeatingEvent): SharePayload {
  const label = new Map(event.tables.map((t) => [t.id, t.label]));
  return {
    v: SHARE_VERSION,
    name: event.name,
    date: event.date,
    venue: event.venue,
    city: event.city,
    tables: event.tables.map((t) => ({ label: t.label, shape: t.shape })),
    guests: event.guests.flatMap((g) => {
      const table = g.seat ? label.get(g.seat.tableId) : undefined;
      return g.seat && table !== undefined ? [{ name: g.name, table, seat: g.seat.index }] : [];
    }),
  };
}

async function pipe(
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new ShareDecodeError('bad-encoding');
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  let bin: string;
  try {
    bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  } catch {
    throw new ShareDecodeError('bad-encoding');
  }
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Encode a share link token: one version byte, then deflate-raw JSON, all base64url. */
export async function encodeShare(event: SeatingEvent): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(toSharePayload(event)));
  const packed = await pipe(json, new CompressionStream('deflate-raw'));
  const out = new Uint8Array(packed.length + 1);
  out[0] = SHARE_VERSION;
  out.set(packed, 1);
  return toBase64Url(out);
}

export async function decodeShare(token: string): Promise<SharePayload> {
  const bytes = fromBase64Url(token.trim());
  if (bytes.length < 2) throw new ShareDecodeError('bad-encoding');
  if (bytes[0] !== SHARE_VERSION) throw new ShareDecodeError('unsupported-version');
  let value: unknown;
  try {
    const json = await pipe(bytes.slice(1), new DecompressionStream('deflate-raw'));
    value = JSON.parse(new TextDecoder().decode(json));
  } catch {
    throw new ShareDecodeError('corrupt');
  }
  if (!isSharePayload(value)) throw new ShareDecodeError('invalid-payload');
  return value;
}

function isSharePayload(v: unknown): v is SharePayload {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  const str = (x: unknown): x is string => typeof x === 'string';
  const rec = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
  return (
    p['v'] === SHARE_VERSION &&
    ['name', 'date', 'venue', 'city'].every((k) => str(p[k])) &&
    Array.isArray(p['tables']) &&
    p['tables'].every((t) => rec(t) && str(t['label']) && ['round', 'long', 'head'].includes(t['shape'] as string)) &&
    Array.isArray(p['guests']) &&
    p['guests'].every(
      (g) =>
        rec(g) && str(g['name']) && str(g['table']) && typeof g['seat'] === 'number' && Number.isInteger(g['seat']),
    )
  );
}
