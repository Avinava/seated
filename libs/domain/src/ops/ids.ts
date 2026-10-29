/**
 * Next free id of the form `${prefix}-${n}`, one past the highest number in use.
 * Ids that do not follow the pattern are ignored, so hand-made ids never clash.
 */
export function nextId(prefix: string, existing: Iterable<{ readonly id: string }>, pad = 0): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  let max = 0;
  for (const { id } of existing) {
    const m = pattern.exec(id);
    if (m?.[1] !== undefined) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${String(max + 1).padStart(pad, '0')}`;
}

export const ID_PREFIX = {
  guest: { prefix: 'g', pad: 3 },
  party: { prefix: 'p', pad: 3 },
  group: { prefix: 'grp', pad: 0 },
  table: { prefix: 't', pad: 0 },
  rule: { prefix: 'r', pad: 0 },
} as const;

export function nextIdFor(kind: keyof typeof ID_PREFIX, existing: Iterable<{ readonly id: string }>): string {
  const { prefix, pad } = ID_PREFIX[kind];
  return nextId(prefix, existing, pad);
}
