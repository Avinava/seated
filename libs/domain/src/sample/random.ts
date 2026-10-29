/** mulberry32: a tiny, fast, seedable PRNG. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, n). */
  int(n: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  /** Pick a key by weight. */
  weighted<K extends string>(weights: Readonly<Record<K, number>>): K;
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed);
  const int = (n: number): number => Math.floor(next() * n);
  return {
    next,
    int,
    chance: (p) => next() < p,
    pick<T>(items: readonly T[]): T {
      const item = items[int(items.length)];
      if (item === undefined) throw new RangeError('pick from an empty list');
      return item;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [out[i], out[j]] = [out[j] as T, out[i] as T];
      }
      return out;
    },
    weighted<K extends string>(weights: Readonly<Record<K, number>>): K {
      const entries = Object.entries(weights) as [K, number][];
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [k, w] of entries) {
        r -= w;
        if (r < 0) return k;
      }
      return (entries.at(-1) as [K, number])[0];
    },
  };
}
