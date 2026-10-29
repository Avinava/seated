// Generated from design/tokens.json by tools/gen-tokens.ts. Do not edit.

export interface ColorToken {
  readonly name: string;
  readonly cssVar: string;
  readonly light: string;
  readonly dark: string;
  readonly note: string;
}

export const COLOR_TOKENS: readonly ColorToken[] = [
  {
    "name": "bg",
    "cssVar": "--st-bg",
    "light": "oklch(0.982 0.003 100)",
    "dark": "oklch(0.17 0.008 250)",
    "note": "Page background"
  },
  {
    "name": "surface",
    "cssVar": "--st-surface",
    "light": "oklch(0.998 0.002 100)",
    "dark": "oklch(0.205 0.009 250)",
    "note": "Cards, panels, inputs"
  },
  {
    "name": "surface-2",
    "cssVar": "--st-surface-2",
    "light": "oklch(0.962 0.004 100)",
    "dark": "oklch(0.245 0.01 250)",
    "note": "Wells, tracks, hover"
  },
  {
    "name": "surface-3",
    "cssVar": "--st-surface-3",
    "light": "oklch(0.93 0.005 100)",
    "dark": "oklch(0.29 0.01 250)",
    "note": "Bar tracks, pressed"
  },
  {
    "name": "line",
    "cssVar": "--st-line",
    "light": "oklch(0.91 0.005 100)",
    "dark": "oklch(0.3 0.01 250)",
    "note": "Hairlines"
  },
  {
    "name": "line-2",
    "cssVar": "--st-line-2",
    "light": "oklch(0.8 0.008 100)",
    "dark": "oklch(0.42 0.012 250)",
    "note": "Strong borders, empty seats"
  },
  {
    "name": "text",
    "cssVar": "--st-text",
    "light": "oklch(0.23 0.015 250)",
    "dark": "oklch(0.95 0.004 100)",
    "note": "Primary text, primary button fill"
  },
  {
    "name": "text-2",
    "cssVar": "--st-text-2",
    "light": "oklch(0.43 0.015 250)",
    "dark": "oklch(0.78 0.008 250)",
    "note": "Secondary text"
  },
  {
    "name": "text-3",
    "cssVar": "--st-text-3",
    "light": "oklch(0.52 0.012 250)",
    "dark": "oklch(0.66 0.01 250)",
    "note": "Captions, mono labels (AA on bg)"
  },
  {
    "name": "accent",
    "cssVar": "--st-accent",
    "light": "oklch(0.572 0.097 188.4)",
    "dark": "oklch(0.75 0.11 185)",
    "note": "Teal. The lit seat, focus, selection"
  },
  {
    "name": "accent-soft",
    "cssVar": "--st-accent-soft",
    "light": "oklch(0.94 0.035 185)",
    "dark": "oklch(0.33 0.055 185)",
    "note": "Accent wash"
  },
  {
    "name": "on-accent",
    "cssVar": "--st-on-accent",
    "light": "oklch(1 0 0)",
    "dark": "oklch(0.18 0.03 185)",
    "note": "Text on accent"
  },
  {
    "name": "cat-1",
    "cssVar": "--st-cat-1",
    "light": "oklch(0.572 0.097 188.4)",
    "dark": "oklch(0.75 0.11 185)",
    "note": "Group tone 1 (teal)"
  },
  {
    "name": "cat-1-soft",
    "cssVar": "--st-cat-1-soft",
    "light": "oklch(0.94 0.035 185)",
    "dark": "oklch(0.33 0.055 185)",
    "note": ""
  },
  {
    "name": "cat-2",
    "cssVar": "--st-cat-2",
    "light": "oklch(0.58 0.13 60)",
    "dark": "oklch(0.8 0.12 70)",
    "note": "Group tone 2 (amber), also awaiting and offline"
  },
  {
    "name": "cat-2-soft",
    "cssVar": "--st-cat-2-soft",
    "light": "oklch(0.95 0.045 75)",
    "dark": "oklch(0.35 0.06 65)",
    "note": ""
  },
  {
    "name": "cat-3",
    "cssVar": "--st-cat-3",
    "light": "oklch(0.52 0.12 320)",
    "dark": "oklch(0.76 0.1 320)",
    "note": "Group tone 3 (plum)"
  },
  {
    "name": "cat-3-soft",
    "cssVar": "--st-cat-3-soft",
    "light": "oklch(0.95 0.03 320)",
    "dark": "oklch(0.34 0.05 320)",
    "note": ""
  },
  {
    "name": "cat-4",
    "cssVar": "--st-cat-4",
    "light": "oklch(0.52 0.12 255)",
    "dark": "oklch(0.76 0.1 255)",
    "note": "Group tone 4 (blue)"
  },
  {
    "name": "cat-4-soft",
    "cssVar": "--st-cat-4-soft",
    "light": "oklch(0.95 0.03 255)",
    "dark": "oklch(0.34 0.05 255)",
    "note": ""
  },
  {
    "name": "ok",
    "cssVar": "--st-ok",
    "light": "oklch(0.5 0.12 150)",
    "dark": "oklch(0.76 0.13 150)",
    "note": "Attending, rule met"
  },
  {
    "name": "ok-soft",
    "cssVar": "--st-ok-soft",
    "light": "oklch(0.95 0.04 150)",
    "dark": "oklch(0.33 0.06 150)",
    "note": ""
  },
  {
    "name": "warn",
    "cssVar": "--st-warn",
    "light": "oklch(0.58 0.13 60)",
    "dark": "oklch(0.8 0.12 70)",
    "note": "Awaiting, waiting rules"
  },
  {
    "name": "warn-soft",
    "cssVar": "--st-warn-soft",
    "light": "oklch(0.95 0.045 75)",
    "dark": "oklch(0.35 0.06 65)",
    "note": ""
  },
  {
    "name": "danger",
    "cssVar": "--st-danger",
    "light": "oklch(0.55 0.18 27)",
    "dark": "oklch(0.72 0.16 27)",
    "note": "Conflict, declined, errors"
  },
  {
    "name": "danger-soft",
    "cssVar": "--st-danger-soft",
    "light": "oklch(0.95 0.035 27)",
    "dark": "oklch(0.34 0.08 27)",
    "note": ""
  },
  {
    "name": "selection",
    "cssVar": "--st-selection",
    "light": "oklch(0.965 0.02 185)",
    "dark": "oklch(0.26 0.03 185)",
    "note": "Selected rows"
  },
  {
    "name": "scrim",
    "cssVar": "--st-scrim",
    "light": "oklch(0.2 0.02 250 / 0.32)",
    "dark": "oklch(0 0 0 / 0.55)",
    "note": "Behind drawers and the palette"
  },
  {
    "name": "dot",
    "cssVar": "--st-dot",
    "light": "oklch(0.87 0.006 100)",
    "dark": "oklch(0.26 0.01 250)",
    "note": "Floor-plan dot grid"
  }
];

export const TYPE_SCALE = {
  "2xs": "10.5px",
  "xs": "11.5px",
  "sm": "12.5px",
  "md": "13px",
  "base": "14px",
  "lg": "16px",
  "xl": "20px",
  "2xl": "24px",
  "3xl": "28px",
  "4xl": "40px",
  "5xl": "56px"
} as const;

export const RADII = {
  "sm": "6px",
  "md": "8px",
  "lg": "10px",
  "xl": "14px",
  "2xl": "16px",
  "pill": "999px"
} as const;
