import { MEALS, type Guest, type Meal, type SeatingEvent, type TableId } from '@seated/domain';
import { MEAL_LABEL, count } from '../../i18n/messages';

export type PrintMode = 'cards' | 'list';

export interface PlaceCard {
  readonly key: string;
  readonly name: string;
  readonly table: string;
  /** One-based. */
  readonly seat: number;
  readonly meal: Meal;
}

export interface MealTotal {
  readonly meal: Meal;
  readonly label: string;
  readonly count: number;
}

export interface TableRow {
  readonly seat: number;
  /** Null for an empty seat, so the caterer sees the gap. */
  readonly name: string | null;
  readonly meal: Meal | null;
}

export interface TableBlock {
  readonly id: TableId;
  readonly label: string;
  readonly seated: number;
  readonly capacity: number;
  readonly rows: readonly TableRow[];
  readonly meals: readonly MealTotal[];
}

/** Seated guests in plan order: tables as listed, then seat order. */
function seatedInOrder(event: SeatingEvent, tableId: TableId | null = null): { g: Guest; table: string }[] {
  const order = new Map(event.tables.map((t, i) => [t.id, i]));
  const label = new Map(event.tables.map((t) => [t.id, t.label]));
  return event.guests
    .filter((g) => g.seat && order.has(g.seat.tableId) && (tableId === null || g.seat.tableId === tableId))
    .map((g) => ({ g, table: label.get(g.seat?.tableId ?? '') ?? '' }))
    .sort(
      (a, b) =>
        (order.get(a.g.seat?.tableId ?? '') ?? 0) - (order.get(b.g.seat?.tableId ?? '') ?? 0) ||
        (a.g.seat?.index ?? 0) - (b.g.seat?.index ?? 0),
    );
}

/** One card per seated guest; pass a table id to reprint a single table. */
export function placeCards(event: SeatingEvent, tableId: TableId | null = null): PlaceCard[] {
  return seatedInOrder(event, tableId).map(({ g, table }) => ({
    key: g.id,
    name: g.name,
    table,
    seat: (g.seat?.index ?? 0) + 1,
    meal: g.meal,
  }));
}

/** Meal counts in the standard order, leaving out meals nobody chose. */
export function mealTotals(meals: readonly Meal[]): MealTotal[] {
  const counts = new Map<Meal, number>();
  for (const m of meals) counts.set(m, (counts.get(m) ?? 0) + 1);
  return MEALS.flatMap((meal) => {
    const n = counts.get(meal) ?? 0;
    return n ? [{ meal, label: MEAL_LABEL[meal], count: n }] : [];
  });
}

/** "48 Veg · 30 Non-veg · 6 Jain". */
export function totalsText(totals: readonly MealTotal[]): string {
  return totals.map((t) => `${count(t.count)} ${t.label}`).join(' · ');
}

/** The caterer's sheet: every table with its seats in order and a meal count. Empty tables are left out. */
export function tableList(event: SeatingEvent): TableBlock[] {
  const seated = seatedInOrder(event);
  return event.tables.flatMap((t) => {
    const here = seated.filter(({ g }) => g.seat?.tableId === t.id).map(({ g }) => g);
    if (!here.length) return [];
    const bySeat = new Map(here.map((g) => [g.seat?.index ?? -1, g]));
    const rows: TableRow[] = Array.from({ length: t.seats }, (_, i) => {
      const g = bySeat.get(i);
      return { seat: i + 1, name: g?.name ?? null, meal: g?.meal ?? null };
    });
    return [
      {
        id: t.id,
        label: t.label,
        seated: here.length,
        capacity: t.seats,
        rows,
        meals: mealTotals(here.map((g) => g.meal)),
      },
    ];
  });
}

/** The short code printed on a card's meal marker, for the caterer at a glance. */
export const MEAL_CODE: Record<Meal, string> = {
  veg: $localize`:@@print.code.veg:V`,
  'non-veg': $localize`:@@print.code.nonVeg:NV`,
  jain: $localize`:@@print.code.jain:J`,
  vegan: $localize`:@@print.code.vegan:VG`,
  other: $localize`:@@print.code.other:O`,
};
