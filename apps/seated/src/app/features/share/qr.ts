/**
 * A small QR Code encoder (ISO/IEC 18004), enough for share links: byte mode,
 * error correction level M or L, versions 1 to 40, automatic mask choice.
 * Pure functions, no DOM; `qrSvg` turns the matrix into an SVG document.
 *
 * The structure follows the standard step by step: encode the bits, split into
 * blocks with Reed-Solomon codewords, draw the function patterns, place the
 * codewords in the zigzag, then pick the mask with the lowest penalty.
 */

export type QrLevel = 'L' | 'M';

export interface QrCode {
  readonly version: number;
  readonly level: QrLevel;
  readonly mask: number;
  readonly size: number;
  /** modules[y][x], true for dark. */
  readonly modules: readonly (readonly boolean[])[];
}

/** Error correction codewords per block, by version (index 0 unused). */
const ECC_PER_BLOCK: Record<QrLevel, readonly number[]> = {
  L: [
    0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  M: [
    0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28,
    28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
  ],
};

/** Number of error correction blocks, by version (index 0 unused). */
const BLOCKS: Record<QrLevel, readonly number[]> = {
  L: [
    0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19,
    19, 20, 21, 22, 24, 25,
  ],
  M: [
    0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33,
    35, 37, 38, 40, 43, 45, 47, 49,
  ],
};

/** The two format bits for each level (L = 01, M = 00). */
const FORMAT_BITS: Record<QrLevel, number> = { L: 1, M: 0 };

export const QR_MIN_VERSION = 1;
export const QR_MAX_VERSION = 40;

/** Modules available for data and error correction, after function patterns. */
export function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

export function dataCodewords(version: number, level: QrLevel): number {
  return Math.floor(rawDataModules(version) / 8) - (ECC_PER_BLOCK[level][version] ?? 0) * (BLOCKS[level][version] ?? 0);
}

function countBits(version: number): number {
  return version <= 9 ? 8 : 16;
}

/** How many bytes fit in byte mode at this version and level. */
export function byteCapacity(version: number, level: QrLevel): number {
  return Math.floor((dataCodewords(version, level) * 8 - 4 - countBits(version)) / 8);
}

// ---------------------------------------------------------------- Reed-Solomon

/** Multiply in GF(2^8) modulo x^8 + x^4 + x^3 + x^2 + 1. */
function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j] ?? 0, root);
      if (j + 1 < result.length) result[j] = (result[j] ?? 0) ^ (result[j + 1] ?? 0);
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

/** The `degree` error correction codewords for a block of data codewords. */
export function reedSolomon(data: readonly number[], degree: number): number[] {
  const divisor = rsDivisor(degree);
  const result = new Array<number>(degree).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() ?? 0);
    result.push(0);
    divisor.forEach((coef, i) => (result[i] = (result[i] ?? 0) ^ gfMul(coef, factor)));
  }
  return result;
}

// ---------------------------------------------------------------- Encoding

/** Data codewords for byte mode: mode, count, bytes, terminator and padding. */
export function encodeData(bytes: Uint8Array, version: number, level: QrLevel): number[] {
  const capacityBits = dataCodewords(version, level) * 8;
  const bits: number[] = [];
  const push = (value: number, length: number): void => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, countBits(version));
  for (const b of bytes) push(b, 8);
  push(0, Math.min(4, capacityBits - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) push(pad, 8);
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) out.push(bits.slice(i, i + 8).reduce((acc, b) => (acc << 1) | b, 0));
  return out;
}

/** Split into blocks, add error correction to each and interleave. */
export function interleave(data: readonly number[], version: number, level: QrLevel): number[] {
  const blocks = BLOCKS[level][version] ?? 1;
  const eccLen = ECC_PER_BLOCK[level][version] ?? 0;
  const raw = Math.floor(rawDataModules(version) / 8);
  const shortBlocks = blocks - (raw % blocks);
  const shortLen = Math.floor(raw / blocks);
  const all: number[][] = [];
  for (let i = 0, k = 0; i < blocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < shortBlocks ? 0 : 1));
    k += dat.length;
    const ecc = reedSolomon(dat, eccLen);
    if (i < shortBlocks) dat.push(0);
    all.push([...dat, ...ecc]);
  }
  const out: number[] = [];
  for (let i = 0; i < (all[0]?.length ?? 0); i++) {
    all.forEach((block, j) => {
      if (i !== shortLen - eccLen || j >= shortBlocks) out.push(block[i] ?? 0);
    });
  }
  return out;
}

// ---------------------------------------------------------------- Matrix

class Matrix {
  readonly modules: boolean[][];
  readonly reserved: boolean[][];

  constructor(readonly size: number) {
    this.modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
    this.reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  }

  fn(x: number, y: number, dark: boolean): void {
    const row = this.modules[y];
    const res = this.reserved[y];
    if (!row || !res || x < 0 || x >= this.size) return;
    row[x] = dark;
    res[x] = true;
  }
}

export function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < count; pos -= step) result.splice(1, 0, pos);
  return result;
}

/** 15 format bits: level and mask, BCH(15,5) protected and XOR-masked. */
export function formatBits(level: QrLevel, mask: number): number {
  const data = (FORMAT_BITS[level] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

/** 18 version bits, BCH(18,6) protected; used from version 7. */
export function versionBits(version: number): number {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (version << 12) | rem;
}

const bit = (value: number, i: number): boolean => ((value >>> i) & 1) !== 0;

function drawFormat(m: Matrix, level: QrLevel, mask: number): void {
  const bits = formatBits(level, mask);
  const n = m.size;
  for (let i = 0; i <= 5; i++) m.fn(8, i, bit(bits, i));
  m.fn(8, 7, bit(bits, 6));
  m.fn(8, 8, bit(bits, 7));
  m.fn(7, 8, bit(bits, 8));
  for (let i = 9; i < 15; i++) m.fn(14 - i, 8, bit(bits, i));
  for (let i = 0; i < 8; i++) m.fn(n - 1 - i, 8, bit(bits, i));
  for (let i = 8; i < 15; i++) m.fn(8, n - 15 + i, bit(bits, i));
  m.fn(8, n - 8, true);
}

function drawFunctionPatterns(m: Matrix, version: number): void {
  const n = m.size;
  for (let i = 0; i < n; i++) {
    m.fn(6, i, i % 2 === 0);
    m.fn(i, 6, i % 2 === 0);
  }
  for (const [cx, cy] of [
    [3, 3],
    [n - 4, 3],
    [3, n - 4],
  ] as const) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < n && y >= 0 && y < n) m.fn(x, y, dist !== 2 && dist !== 4);
      }
    }
  }
  const align = alignmentPositions(version);
  const last = align.length - 1;
  align.forEach((ax, i) =>
    align.forEach((ay, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) m.fn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }),
  );
  drawFormat(m, 'M', 0); // placeholder, so the area is reserved; redrawn with the real mask
  if (version >= 7) {
    const bits = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const a = n - 11 + (i % 3);
      const b = Math.floor(i / 3);
      m.fn(a, b, bit(bits, i));
      m.fn(b, a, bit(bits, i));
    }
  }
}

function drawCodewords(m: Matrix, codewords: readonly number[]): void {
  const n = m.size;
  let i = 0;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? n - 1 - vert : vert;
        const row = m.modules[y];
        if (row && !m.reserved[y]?.[x] && i < codewords.length * 8) {
          row[x] = bit(codewords[i >>> 3] ?? 0, 7 - (i & 7));
          i++;
        }
      }
    }
  }
}

const MASKS: readonly ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function applyMask(m: Matrix, mask: number): void {
  const test = MASKS[mask];
  if (!test) return;
  for (let y = 0; y < m.size; y++) {
    const row = m.modules[y];
    for (let x = 0; x < m.size; x++) if (row && !m.reserved[y]?.[x] && test(x, y)) row[x] = !row[x];
  }
}

/** The four penalty rules of the standard; lower is easier to scan. */
export function penalty(modules: readonly (readonly boolean[])[]): number {
  const n = modules.length;
  const at = (x: number, y: number): boolean => modules[y]?.[x] ?? false;
  let score = 0;
  // A 1:1:3:1:1 run with four light modules on either side; the quiet zone counts as light.
  const finderLike = (line: boolean[]): number => {
    const s = `0000${line.map((d) => (d ? '1' : '0')).join('')}0000`;
    let hits = 0;
    for (let i = s.indexOf('1011101'); i >= 0; i = s.indexOf('1011101', i + 1)) {
      if (s.slice(i - 4, i) === '0000' || s.slice(i + 7, i + 11) === '0000') hits++;
    }
    return hits;
  };
  for (const horizontal of [true, false]) {
    for (let a = 0; a < n; a++) {
      const line = Array.from({ length: n }, (_, b) => (horizontal ? at(b, a) : at(a, b)));
      let run = 1;
      for (let b = 1; b <= n; b++) {
        if (b < n && line[b] === line[b - 1]) run++;
        else {
          if (run >= 5) score += 3 + (run - 5);
          run = 1;
        }
      }
      score += 40 * finderLike(line);
    }
  }
  let dark = 0;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (at(x, y)) dark++;
      if (x < n - 1 && y < n - 1) {
        const c = at(x, y);
        if (c === at(x + 1, y) && c === at(x, y + 1) && c === at(x + 1, y + 1)) score += 3;
      }
    }
  }
  const total = n * n;
  score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return score;
}

/**
 * Encode text (as UTF-8) in the smallest symbol that fits, then raise the error
 * correction to M when that still fits the same size. Share links are long, so
 * a smaller, chunkier symbol scans better than extra redundancy would.
 * Throws a RangeError past version 40.
 */
export function encodeQr(text: string): QrCode {
  const bytes = new TextEncoder().encode(text);
  for (let version = QR_MIN_VERSION; version <= QR_MAX_VERSION; version++) {
    if (bytes.length <= byteCapacity(version, 'L')) {
      return build(bytes, version, bytes.length <= byteCapacity(version, 'M') ? 'M' : 'L');
    }
  }
  throw new RangeError('qr-too-long');
}

function build(bytes: Uint8Array, version: number, level: QrLevel): QrCode {
  const codewords = interleave(encodeData(bytes, version, level), version, level);
  let best: { mask: number; score: number; modules: boolean[][] } | null = null;
  for (let mask = 0; mask < 8; mask++) {
    const m = new Matrix(version * 4 + 17);
    drawFunctionPatterns(m, version);
    drawCodewords(m, codewords);
    applyMask(m, mask);
    drawFormat(m, level, mask);
    const score = penalty(m.modules);
    if (!best || score < best.score) best = { mask, score, modules: m.modules };
  }
  // `best` is always set: the loop runs eight times.
  const chosen = best as { mask: number; modules: boolean[][] };
  return { version, level, mask: chosen.mask, size: version * 4 + 17, modules: chosen.modules };
}

/** One SVG path for every dark module, merging horizontal runs; a four-module quiet zone. */
export function qrPath(code: QrCode, quiet = 4): string {
  const parts: string[] = [];
  code.modules.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      let end = x;
      while (row[end + 1]) end++;
      parts.push(`M${x + quiet} ${y + quiet}h${end - x + 1}v1h-${end - x + 1}z`);
      x = end;
    }
  });
  return parts.join('');
}

/** A standalone SVG document: black on white so it prints and scans anywhere. */
export function qrSvg(code: QrCode, title: string, quiet = 4): string {
  const dim = code.size + quiet * 2;
  const esc = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${dim * 8}" height="${dim * 8}" ` +
    `shape-rendering="crispEdges" role="img"><title>${esc}</title>` +
    `<rect width="${dim}" height="${dim}" fill="white"/><path fill="black" d="${qrPath(code, quiet)}"/></svg>\n`
  );
}
