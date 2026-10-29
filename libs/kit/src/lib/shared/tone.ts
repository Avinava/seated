import type { Tone } from '@seated/domain';

/** A category tone (1..4, matching the four group colours) or a status tone. */
export type StTone = 'neutral' | Tone | 'ok' | 'warn' | 'danger';

/** What templates may pass: numbers bound with [tone]="2" or strings written tone="2". */
export type StToneInput = StTone | `${Tone}` | null | undefined;

/** Input transform that accepts tone="2" as well as [tone]="2", defaulting to neutral. */
export function toTone(value: StToneInput): StTone {
  if (value === null || value === undefined) return 'neutral';
  if (value === '1' || value === '2' || value === '3' || value === '4') return Number(value) as Tone;
  return value;
}

/** The CSS custom property pair for a tone: [strong, soft]. Neutral maps to text on surface-2. */
export function toneVars(tone: StTone): { readonly fg: string; readonly soft: string } {
  switch (tone) {
    case 'neutral':
      return { fg: 'var(--st-text-3)', soft: 'var(--st-surface-2)' };
    case 'ok':
    case 'warn':
    case 'danger':
      return { fg: `var(--st-${tone})`, soft: `var(--st-${tone}-soft)` };
    default:
      return { fg: `var(--st-cat-${tone})`, soft: `var(--st-cat-${tone}-soft)` };
  }
}
