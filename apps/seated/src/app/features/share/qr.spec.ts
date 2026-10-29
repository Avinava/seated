import {
  alignmentPositions,
  byteCapacity,
  encodeData,
  encodeQr,
  formatBits,
  qrPath,
  qrSvg,
  reedSolomon,
  versionBits,
  type QrCode,
} from './qr';

describe('qr', () => {
  // Byte-mode capacities from the standard's table.
  it.each([
    [1, 'L', 17],
    [1, 'M', 14],
    [2, 'M', 26],
    [5, 'L', 106],
    [5, 'M', 84],
    [7, 'M', 122],
    [10, 'L', 271],
    [10, 'M', 213],
    [20, 'M', 666],
    [27, 'L', 1465],
    [40, 'L', 2953],
    [40, 'M', 2331],
  ] as const)('version %i-%s holds %i bytes', (version, level, bytes) => {
    expect(byteCapacity(version, level)).toBe(bytes);
  });

  it('computes Reed-Solomon codewords (HELLO WORLD, 1-M)', () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
    expect(reedSolomon(data, 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });

  it.each([
    ['L', 0, 0b111011111000100],
    ['L', 4, 0b110011000101111],
    ['M', 0, 0b101010000010010],
    ['M', 7, 0b100101010100000],
  ] as const)('format bits for %s mask %i', (level, mask, bits) => {
    expect(formatBits(level, mask)).toBe(bits);
  });

  it.each([
    [7, 0b000111110010010100],
    [21, 0b010101011010000011],
    [40, 0b101000110001101001],
  ])('version bits for version %i', (version, bits) => {
    expect(versionBits(version)).toBe(bits);
  });

  it.each([
    [1, []],
    [2, [6, 18]],
    [7, [6, 22, 38]],
    [32, [6, 34, 60, 86, 112, 138]],
    [40, [6, 30, 58, 86, 114, 142, 170]],
  ])('places alignment patterns for version %i', (version, positions) => {
    expect(alignmentPositions(version)).toEqual(positions);
  });

  it('pads data with the alternating pad bytes', () => {
    const words = encodeData(new TextEncoder().encode('hi'), 1, 'M');
    expect(words).toHaveLength(16);
    expect(words.slice(0, 4)).toEqual([0x40, 0x26, 0x86, 0x90]);
    expect(words.slice(4, 8)).toEqual([0xec, 0x11, 0xec, 0x11]);
  });

  function finderAt(code: QrCode, x0: number, y0: number): boolean {
    for (let dy = 0; dy < 7; dy++) {
      for (let dx = 0; dx < 7; dx++) {
        const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
        if (code.modules[y0 + dy]?.[x0 + dx] !== (ring !== 2)) return false;
      }
    }
    return true;
  }

  function readFormat(code: QrCode): number {
    let bits = 0;
    const cells: [number, number][] = [
      [8, 0],
      [8, 1],
      [8, 2],
      [8, 3],
      [8, 4],
      [8, 5],
      [8, 7],
      [8, 8],
      [7, 8],
      [5, 8],
      [4, 8],
      [3, 8],
      [2, 8],
      [1, 8],
      [0, 8],
    ];
    cells.forEach(([x, y], i) => (bits |= (code.modules[y]?.[x] ? 1 : 0) << i));
    return bits;
  }

  it.each([
    ['https://seated.app/s#AQ', 'M', 2],
    ['x'.repeat(200), 'L', 9],
    ['x'.repeat(2400), 'L', 36],
  ] as const)('builds a well-formed symbol for %#', (text, level, version) => {
    const code = encodeQr(text);
    expect(code.level).toBe(level);
    expect(code.version).toBe(version);
    expect(code.size).toBe(version * 4 + 17);
    expect(code.modules).toHaveLength(code.size);
    expect(finderAt(code, 0, 0)).toBe(true);
    expect(finderAt(code, code.size - 7, 0)).toBe(true);
    expect(finderAt(code, 0, code.size - 7)).toBe(true);
    // Timing pattern alternates between the finders.
    for (let i = 8; i < code.size - 8; i++) expect(code.modules[6]?.[i]).toBe(i % 2 === 0);
    // The format area names the level and mask the encoder chose.
    expect(readFormat(code)).toBe(formatBits(level, code.mask));
    // The dark module.
    expect(code.modules[code.size - 8]?.[8]).toBe(true);
  });

  it('refuses text longer than version 40 holds', () => {
    expect(() => encodeQr('x'.repeat(3000))).toThrow(RangeError);
  });

  it('draws one path segment per horizontal run and wraps it in an SVG with a title', () => {
    const code: QrCode = {
      version: 1,
      level: 'M',
      mask: 0,
      size: 3,
      modules: [
        [true, true, false],
        [false, false, false],
        [true, false, true],
      ],
    };
    expect(qrPath(code, 1)).toBe('M1 1h2v1h-2zM1 3h1v1h-1zM3 3h1v1h-1z');
    const svg = qrSvg(code, 'Link to <Mehta> & co', 1);
    expect(svg).toContain('<title>Link to &lt;Mehta&gt; &amp; co</title>');
    expect(svg).toContain('viewBox="0 0 5 5"');
  });
});
