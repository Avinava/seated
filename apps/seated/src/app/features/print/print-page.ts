import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StButton, StEmptyState, StIcon, StInput, StSegmented, StSwitch, type SegmentedOption } from '@seated/kit';
import { localDate } from '../../core/dates';
import { count } from '../../i18n/messages';
import { EventStore } from '../../state/event-store';
import { PlaceCards } from './place-cards';
import { mealTotals, placeCards, tableList, type PrintMode } from './print.vm';
import { TableList } from './table-list';

/**
 * Print: place cards or the caterer's table list. The screen shows a paper
 * preview; the print stylesheet drops the app chrome and prints black on
 * white. Mode, table and the meal marker live in the URL (?mode=list).
 */
@Component({
  selector: 'st-print-page',
  imports: [PlaceCards, RouterLink, StButton, StEmptyState, StIcon, StInput, StSegmented, StSwitch, TableList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './print-page.html',
  styleUrl: './print-page.scss',
})
export default class PrintPage {
  private readonly store = inject(EventStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly doc = inject(DOCUMENT);

  /** Query params, bound by the router. */
  readonly mode = input<string>();
  readonly table = input<string>();
  readonly meals = input<string>();

  protected readonly event = this.store.doc;
  protected readonly view = computed<PrintMode>(() => (this.mode() === 'list' ? 'list' : 'cards'));
  protected readonly tableId = computed(() => {
    const id = this.table();
    return id && this.store.tablesById().has(id) ? id : null;
  });
  protected readonly showMeal = computed(() => this.meals() === '1');

  protected readonly modes: readonly SegmentedOption<PrintMode>[] = [
    { value: 'cards', label: $localize`:@@print.cards:Place cards` },
    { value: 'list', label: $localize`:@@print.list:Table list` },
  ];

  protected readonly cards = computed(() => {
    const e = this.event();
    return e ? placeCards(e, this.tableId()) : [];
  });
  protected readonly blocks = computed(() => {
    const e = this.event();
    return e ? tableList(e) : [];
  });
  protected readonly totals = computed(() =>
    mealTotals(this.blocks().flatMap((b) => b.rows.flatMap((r) => (r.meal ? [r.meal] : [])))),
  );
  protected readonly seatedCount = computed(() => this.blocks().reduce((n, b) => n + b.seated, 0));

  protected readonly note = computed(() =>
    this.view() === 'cards'
      ? $localize`:@@print.cardsNote:${count(this.cards().length)}:n: cards · fold to 3.5 × 2 in`
      : $localize`:@@print.listNote:${count(this.seatedCount())}:n: guests at ${count(this.blocks().length)}:tables: tables`,
  );

  protected readonly subtitle = computed(() => {
    const e = this.event();
    if (!e) return '';
    return `${e.venue}, ${e.city} · ${localDate(e.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`;
  });

  protected setParam(key: 'mode' | 'table' | 'meals', value: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [key]: value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected print(): void {
    this.doc.defaultView?.print();
  }
}
