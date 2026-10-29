import type { IconName } from '../../icons/icon/icons';

/** One runnable command in the palette. */
export interface PaletteItem {
  readonly id: string;
  readonly label: string;
  /** Section heading the item is listed under, e.g. "Navigate" or "Actions". */
  readonly group: string;
  /** Secondary text shown after the label; also searched. */
  readonly hint?: string;
  /** Shortcut in StKbd form, e.g. "Mod+Shift+A". */
  readonly shortcut?: string;
  readonly icon?: IconName;
  /** Extra search terms that are never shown. */
  readonly keywords?: string;
}

export interface PaletteGroup {
  readonly name: string;
  readonly items: readonly PaletteItem[];
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/**
 * Ranks one item against a lower-cased, trimmed query. Lower is better;
 * `null` means no match.
 *
 * 0. the label starts with the query ("auto" -> "Auto-seat guests")
 * 1. a word in the label starts with the query ("seat" -> "Auto-seat guests")
 * 2. the label's word initials start with the query ("asg" -> "Auto-seat guests")
 * 3. the label contains the query anywhere
 * 4. the hint, group or keywords contain the query
 */
export function paletteScore(item: PaletteItem, query: string): number | null {
  const label = item.label.toLowerCase();
  if (label.startsWith(query)) return 0;
  const labelWords = words(item.label);
  if (labelWords.some((w) => w.startsWith(query))) return 1;
  const compact = query.replace(/\s+/g, '');
  const initials = labelWords.map((w) => w[0]).join('');
  if (compact.length > 1 && initials.startsWith(compact)) return 2;
  if (label.includes(query)) return 3;
  const extra = [item.hint, item.group, item.keywords].filter(Boolean).join(' ').toLowerCase();
  if (extra.includes(query)) return 4;
  return null;
}

/**
 * Filters and ranks palette items. An empty query keeps every item in its
 * original order; otherwise better matches come first and ties keep their
 * original order (the sort is stable).
 */
export function filterPaletteItems(items: readonly PaletteItem[], query: string): PaletteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  return items
    .map((item, index) => ({ item, index, score: paletteScore(item, q) }))
    .filter((r): r is { item: PaletteItem; index: number; score: number } => r.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((r) => r.item);
}

/**
 * Groups ranked items under their headings. Groups appear in the order of their
 * best-ranked item, so the top result is always the first option.
 */
export function groupPaletteItems(items: readonly PaletteItem[]): PaletteGroup[] {
  const groups = new Map<string, PaletteItem[]>();
  for (const item of items) {
    const list = groups.get(item.group);
    if (list) list.push(item);
    else groups.set(item.group, [item]);
  }
  return [...groups].map(([name, list]) => ({ name, items: list }));
}
