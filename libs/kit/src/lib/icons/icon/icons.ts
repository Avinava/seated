/**
 * The kit's icon registry. Every icon is drawn on a 24 x 24 grid as a list of
 * stroke-only path segments, so it renders through plain `[attr.d]` bindings
 * with no innerHTML and no sanitiser bypass.
 */

/** A circle expressed as two arcs, so the registry only ever holds paths. */
function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
}

const MAGNIFIER = [circle(11, 11, 7), 'm20 20-3.8-3.8'];

export const ICONS = {
  search: MAGNIFIER,
  command: ['M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3'],
  users: [
    circle(9, 7, 4),
    'M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2',
    'M16 3.13a4 4 0 0 1 0 7.75',
    'M21 21v-2a4 4 0 0 0-3-3.87',
  ],
  seat: [
    'M6 11V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6',
    'M5 11h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z',
    'M6 15v6',
    'M18 15v6',
  ],
  table: [
    circle(12, 12, 4.5),
    circle(12, 3.5, 1.5),
    circle(20.5, 12, 1.5),
    circle(12, 20.5, 1.5),
    circle(3.5, 12, 1.5),
  ],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  check: ['M20 6 9 17l-5-5'],
  'chevron-down': ['m6 9 6 6 6-6'],
  'chevron-up': ['m18 15-6-6-6 6'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'chevron-left': ['m15 18-6-6 6-6'],
  'arrow-up': ['M12 19V5', 'm5 12 7-7 7 7'],
  'arrow-down': ['M12 5v14', 'm19 12-7 7-7-7'],
  undo: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  redo: ['m15 14 5-5-5-5', 'M20 9H9.5a5.5 5.5 0 0 0 0 11H13'],
  sparkles: ['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z', 'M19 3v4', 'M21 5h-4', 'M5 17v4', 'M7 19H3'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'],
  share: [circle(18, 5, 3), circle(6, 12, 3), circle(18, 19, 3), 'm8.6 13.5 6.8 4', 'm15.4 6.5-6.8 4'],
  printer: [
    'M6 9V2h12v7',
    'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2',
    'M6 14h12v8H6z',
  ],
  sun: [
    circle(12, 12, 4),
    'M12 2v2',
    'M12 20v2',
    'm4.93 4.93 1.41 1.41',
    'm17.66 17.66 1.41 1.41',
    'M2 12h2',
    'M20 12h2',
    'm6.34 17.66-1.41 1.41',
    'm19.07 4.93-1.41 1.41',
  ],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z'],
  filter: ['M22 3H2l8 9.46V19l4 2v-8.54z'],
  more: [circle(5, 12, 1), circle(12, 12, 1), circle(19, 12, 1)],
  alert: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
  info: [circle(12, 12, 10), 'M12 16v-4', 'M12 8h.01'],
  link: [
    'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
    'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  ],
  qr: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h3v3h-3z', 'M21 14v.01', 'M14 21h.01', 'M17 21h4v-4'],
  calendar: ['M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  'map-pin': ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z', circle(12, 10, 3)],
  accessibility: [
    circle(16, 4, 1),
    'm18 19 1-7-6 1',
    'm5 8 3-3 5.5 3-2.36 3.5',
    'M4.24 14.5a5 5 0 0 0 6.88 6',
    'M13.76 17.5a5 5 0 0 0-6.88-6',
  ],
  utensils: ['M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2', 'M7 2v20', 'M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7'],
  tag: [
    'M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z',
    circle(7.5, 7.5, 0.5),
  ],
  grip: [circle(9, 5, 1), circle(9, 12, 1), circle(9, 19, 1), circle(15, 5, 1), circle(15, 12, 1), circle(15, 19, 1)],
  'zoom-in': [...MAGNIFIER, 'M11 8v6', 'M8 11h6'],
  'zoom-out': [...MAGNIFIER, 'M8 11h6'],
  maximize: [
    'M8 3H5a2 2 0 0 0-2 2v3',
    'M21 8V5a2 2 0 0 0-2-2h-3',
    'M3 16v3a2 2 0 0 0 2 2h3',
    'M16 21h3a2 2 0 0 0 2-2v-3',
  ],
  trash: [
    'M3 6h18',
    'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
    'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    'M10 11v6',
    'M14 11v6',
  ],
  edit: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z'],
  home: ['M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z'],
  'wifi-off': [
    'm2 2 20 20',
    'M8.5 16.5a5 5 0 0 1 7 0',
    'M2 8.82a15 15 0 0 1 4.17-2.65',
    'M10.66 5c4.01-.36 8.14.9 11.34 3.76',
    'M16.85 11.25a10 10 0 0 1 2.22 1.68',
    'M5 13a10 10 0 0 1 5.24-2.76',
    'M12 20h.01',
  ],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICONS;

/** Every registered icon name, in registry order. Handy for pickers and stories. */
export const ICON_NAMES = Object.keys(ICONS) as readonly IconName[];
