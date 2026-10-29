import { slug } from './download';

describe('slug', () => {
  it.each([
    ["Ananya & Kabir's wedding", 'ananya-and-kabir-s-wedding'],
    ['Café Déjà vu 2026', 'cafe-deja-vu-2026'],
    ['  --  ', 'event'],
  ])('turns %j into %j', (text, expected) => {
    expect(slug(text)).toBe(expected);
  });
});
