import { COLOR_TOKENS } from './tokens.g';

describe('generated tokens', () => {
  it('gives every colour a light and a dark value', () => {
    for (const t of COLOR_TOKENS) {
      expect(t.light, t.name).toMatch(/^oklch\(/);
      expect(t.dark, t.name).toMatch(/^oklch\(/);
    }
  });

  it('includes the four group tones and their soft variants', () => {
    const names = COLOR_TOKENS.map((t) => t.name);
    for (const n of [1, 2, 3, 4]) expect(names).toEqual(expect.arrayContaining([`cat-${n}`, `cat-${n}-soft`]));
  });
});
