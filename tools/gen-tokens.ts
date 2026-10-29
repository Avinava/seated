/**
 * Turns design/tokens.json into the kit's CSS custom properties and a typed
 * token index. `--check` exits 1 when the generated files are stale, which the
 * gate uses so the JSON stays the single source.
 *
 *   pnpm exec tsx tools/gen-tokens.ts [--check]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface Themed {
  light: string;
  dark: string;
  note?: string;
}
interface Tokens {
  color: Record<string, Themed>;
  shadow: Record<string, Themed>;
  font: Record<string, string>;
  text: Record<string, string>;
  tracking: Record<string, string>;
  space: Record<string, string>;
  radius: Record<string, string>;
  size: Record<string, string>;
  motion: Record<string, string>;
  z: Record<string, string>;
}

const root = resolve(import.meta.dirname, '..');
const src = resolve(root, 'design/tokens.json');
const cssOut = resolve(root, 'libs/kit/src/tokens/tokens.g.css');
const tsOut = resolve(root, 'libs/kit/src/tokens/tokens.g.ts');

const tokens = JSON.parse(readFileSync(src, 'utf8')) as Tokens;
const header = 'Generated from design/tokens.json by tools/gen-tokens.ts. Do not edit.';

const isDuration = (v: string) => /^\d+m?s$/.test(v);
const motionVar = (k: string, v: string) => (isDuration(v) ? `--st-dur-${k}` : `--st-ease-${k}`);

const fixed: [string, string][] = [
  ...Object.entries(tokens.font).map(([k, v]): [string, string] => [`--st-font-${k}`, v]),
  ...Object.entries(tokens.text).map(([k, v]): [string, string] => [`--st-fs-${k}`, v]),
  ...Object.entries(tokens.tracking).map(([k, v]): [string, string] => [`--st-tracking-${k}`, v]),
  ...Object.entries(tokens.space).map(([k, v]): [string, string] => [`--st-space-${k}`, v]),
  ...Object.entries(tokens.radius).map(([k, v]): [string, string] => [`--st-radius-${k}`, v]),
  ...Object.entries(tokens.size).map(([k, v]): [string, string] => [`--st-size-${k}`, v]),
  ...Object.entries(tokens.motion).map(([k, v]): [string, string] => [motionVar(k, v), v]),
  ...Object.entries(tokens.z).map(([k, v]): [string, string] => [`--st-z-${k}`, v]),
];

const themed = (mode: 'light' | 'dark'): [string, string][] => [
  ...Object.entries(tokens.color).map(([k, v]): [string, string] => [`--st-${k}`, v[mode]]),
  ...Object.entries(tokens.shadow).map(([k, v]): [string, string] => [`--st-shadow-${k}`, v[mode]]),
];

const block = (selector: string, decls: [string, string][], indent = '') =>
  `${indent}${selector} {\n${decls.map(([k, v]) => `${indent}  ${k}: ${v};`).join('\n')}\n${indent}}`;

const css = [
  `/* ${header} */`,
  '',
  block(':root', [...fixed, ['color-scheme', 'light'], ...themed('light')]),
  '',
  '@media (prefers-color-scheme: dark) {',
  block(":root:not([data-theme='light'])", [['color-scheme', 'dark'], ...themed('dark')], '  '),
  '}',
  '',
  block(":root[data-theme='dark']", [['color-scheme', 'dark'], ...themed('dark')]),
  '',
].join('\n');

const ts = [
  `// ${header}`,
  '',
  'export interface ColorToken {',
  '  readonly name: string;',
  '  readonly cssVar: string;',
  '  readonly light: string;',
  '  readonly dark: string;',
  '  readonly note: string;',
  '}',
  '',
  `export const COLOR_TOKENS: readonly ColorToken[] = ${JSON.stringify(
    Object.entries(tokens.color).map(([name, v]) => ({
      name,
      cssVar: `--st-${name}`,
      light: v.light,
      dark: v.dark,
      note: v.note ?? '',
    })),
    null,
    2,
  )};`,
  '',
  `export const TYPE_SCALE = ${JSON.stringify(tokens.text, null, 2)} as const;`,
  '',
  `export const RADII = ${JSON.stringify(tokens.radius, null, 2)} as const;`,
  '',
].join('\n');

const check = process.argv.includes('--check');
const outputs: [string, string][] = [
  [cssOut, css],
  [tsOut, ts],
];

if (check) {
  const stale = outputs.filter(([p, c]) => !existsSync(p) || readFileSync(p, 'utf8') !== c);
  if (stale.length) {
    console.error(`Stale tokens: ${stale.map(([p]) => p.replace(root + '/', '')).join(', ')}. Run mise run gen.`);
    process.exit(1);
  }
  console.log('tokens up to date');
} else {
  for (const [p, c] of outputs) writeFileSync(p, c);
  console.log('tokens written');
}
