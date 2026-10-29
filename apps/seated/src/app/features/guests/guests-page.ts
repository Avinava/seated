import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  MEALS,
  RSVPS,
  addTag,
  assignTable,
  removeGuests,
  setRsvp,
  updateGuest,
  type Meal,
  type Rsvp,
} from '@seated/domain';
import {
  StAvatar,
  StButton,
  StCell,
  StChip,
  StDataGrid,
  StDialog,
  StEmptyState,
  StIcon,
  StIconButton,
  StInput,
  StPill,
  StSegmented,
  type GridColumn,
  type GridSort,
  type SegmentedOption,
} from '@seated/kit';
import { Hotkeys } from '../../core/hotkeys';
import { MEAL_LABEL, RSVP_LABEL, count } from '../../i18n/messages';
import { PaletteRegistry, type PaletteCommand } from '../../shell/palette-registry';
import { Actions } from '../../state/actions';
import { command } from '../../state/command';
import { EventStore } from '../../state/event-store';
import { GuestBulkBar } from './guest-bulk-bar';
import { GuestPanel } from './guest-panel';
import {
  GROUP_BYS,
  LABELS,
  NEW_GUEST,
  RSVP_TONE,
  SORT_KEYS,
  filterRows,
  formatSort,
  groupRows,
  guestCount,
  isFiltered,
  parseQuery,
  rsvpCounts,
  sentence,
  shownText,
  sortRows,
  summary,
  tableOptions,
  tagsInUse,
  toRows,
  who,
  type GroupBy,
  type GuestRow,
  type SortKey,
} from './guests.vm';

type QueryKey = 'q' | 'rsvp' | 'group' | 'meal' | 'tag' | 'by' | 'sort' | 'guest';
type RsvpFilter = Rsvp | 'all';

const GROUP_BY_LABEL: Record<GroupBy, string> = {
  none: $localize`:@@guests.by.none:Nothing`,
  party: $localize`:@@guests.by.party:Party`,
  group: $localize`:@@guests.by.group:Group`,
  rsvp: $localize`:@@guests.by.rsvp:RSVP`,
  meal: $localize`:@@guests.by.meal:Meal`,
  table: $localize`:@@guests.by.table:Table`,
};

/**
 * The guest list. Everything about the view (search, filters, grouping, sort
 * and the open guest) lives in the URL and arrives as inputs, so any view can
 * be shared or reloaded. The page only wires the pieces; the work happens in
 * guests.vm.ts and guest-form.ts.
 */
@Component({
  selector: 'st-guests-page',
  imports: [
    RouterLink,
    StAvatar,
    StButton,
    StCell,
    StChip,
    StDataGrid,
    StDialog,
    StEmptyState,
    StIcon,
    StIconButton,
    StInput,
    StPill,
    StSegmented,
    GuestBulkBar,
    GuestPanel,
  ],
  templateUrl: './guests-page.html',
  styleUrl: './guests-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class GuestsPage {
  protected readonly store = inject(EventStore);
  private readonly actions = inject(Actions);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Query params, bound by the router -------------------------------------------
  readonly q = input<string>();
  readonly rsvp = input<string>();
  readonly group = input<string>();
  readonly meal = input<string>();
  readonly tag = input<string>();
  readonly by = input<string>();
  readonly sort = input<string>();
  /** A guest id or `new`: opens the guest panel. */
  readonly guest = input<string>();

  private readonly search = viewChild<StInput>('search');
  private readonly grid = viewChild(StDataGrid, { read: ElementRef });
  private readonly injector = inject(Injector);

  protected readonly query = computed(() =>
    parseQuery({
      q: this.q(),
      rsvp: this.rsvp(),
      group: this.group(),
      meal: this.meal(),
      tag: this.tag(),
      by: this.by(),
      sort: this.sort(),
    }),
  );

  // Rows -------------------------------------------------------------------------

  private readonly allRows = computed(() => {
    const doc = this.store.doc();
    return doc ? toRows(doc) : [];
  });
  /** Everything but the RSVP filter, so the RSVP tabs can show what each would leave. */
  private readonly beforeRsvp = computed(() => filterRows(this.allRows(), this.query(), { ignoreRsvp: true }));
  protected readonly filtered = computed(() => {
    const rsvp = this.query().rsvp;
    const rows = this.beforeRsvp();
    return rsvp === null ? rows : rows.filter((r) => r.rsvp === rsvp);
  });
  protected readonly rows = computed(() => {
    const doc = this.store.doc();
    const q = this.query();
    return doc ? groupRows(sortRows(this.filtered(), q.sort), q.by, doc) : [];
  });

  protected readonly total = computed(() => this.allRows().length);
  protected readonly filteredOn = computed(() => isFiltered(this.query()));
  protected readonly summary = computed(() => {
    const doc = this.store.doc();
    return doc ? summary(doc) : '';
  });
  protected readonly shown = computed(() => shownText(this.filtered().length, this.total()));
  protected readonly clearHint = computed(
    () =>
      $localize`:@@guests.noMatchBody:Try a shorter search, or clear the filters to see all ${guestCount(this.total())}:guests:.`,
  );

  // Toolbar options ----------------------------------------------------------------

  protected readonly rsvpOptions = computed<SegmentedOption<RsvpFilter>[]>(() => {
    const c = rsvpCounts(this.beforeRsvp());
    return [
      { value: 'all', label: $localize`:@@guests.rsvp.all:All`, count: c.all },
      ...RSVPS.map((r) => ({ value: r, label: RSVP_LABEL[r], count: c[r] })),
    ];
  });
  protected readonly rsvpValue = computed<RsvpFilter>(() => this.query().rsvp ?? 'all');
  protected readonly groups = this.store.groups;
  protected readonly meals = MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }));
  protected readonly rsvps = RSVPS.map((r) => ({ value: r, label: RSVP_LABEL[r] }));
  protected readonly tags = computed(() => {
    const doc = this.store.doc();
    return doc ? tagsInUse(doc) : [];
  });
  protected readonly groupBys = GROUP_BYS.map((value) => ({ value, label: GROUP_BY_LABEL[value] }));
  protected readonly sortKeys = SORT_KEYS.map((value) => ({
    value,
    label: value === 'name' ? $localize`:@@guests.col.name:Name` : GROUP_BY_LABEL[value],
  }));
  protected readonly tables = computed(() => {
    const doc = this.store.doc();
    return doc ? tableOptions(doc) : [];
  });

  protected readonly rsvpLabel = RSVP_LABEL;
  protected readonly mealLabel = MEAL_LABEL;
  protected readonly rsvpTone = RSVP_TONE;

  protected readonly columns: GridColumn[] = [
    { key: 'name', header: $localize`:@@guests.col.name:Name`, width: 'minmax(200px, 2fr)', sortable: true },
    { key: 'party', header: $localize`:@@guests.col.party:Party`, width: 'minmax(120px, 1.2fr)', sortable: true },
    { key: 'group', header: $localize`:@@guests.col.group:Group`, width: 'minmax(140px, 1fr)', sortable: true },
    { key: 'rsvp', header: $localize`:@@guests.col.rsvp:RSVP`, width: '112px', sortable: true },
    { key: 'meal', header: $localize`:@@guests.col.meal:Meal`, width: '100px', sortable: true },
    { key: 'tags', header: $localize`:@@guests.col.tags:Tags`, width: 'minmax(100px, 1fr)' },
    { key: 'table', header: $localize`:@@guests.col.table:Table`, width: '72px', sortable: true },
    { key: 'access', header: $localize`:@@guests.col.access:Access`, width: '68px' },
  ];

  // Selection and bulk actions ----------------------------------------------------

  protected readonly selection = signal<ReadonlySet<string>>(new Set());
  /** Only rows in view count: a filter hides a row from bulk actions too. */
  protected readonly selected = computed(() => {
    const sel = this.selection();
    return sel.size === 0 ? [] : this.filtered().filter((r) => sel.has(r.id));
  });
  protected readonly confirmRemove = signal(false);
  protected readonly removeHeading = computed(
    () => $localize`:@@guests.removeHeading:Remove ${who(this.selected())}:who:?`,
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    inject(PaletteRegistry).register(this.paletteCommands, destroyRef);
    inject(Hotkeys).on('/', () => this.search()?.element.focus(), destroyRef);
  }

  private readonly paletteCommands = computed<PaletteCommand[]>(() => {
    const act = $localize`:@@palette.actions:Actions`;
    const people = $localize`:@@palette.guests:Guests`;
    const unseated = $localize`:@@guests.unseated:Unseated`;
    return [
      {
        id: 'guests.add',
        label: $localize`:@@palette.addGuest:Add a guest`,
        group: act,
        icon: 'plus',
        run: () => this.openGuest(NEW_GUEST),
      },
      {
        id: 'guests.clear',
        label: $localize`:@@palette.clearFilters:Clear filters`,
        group: act,
        icon: 'filter',
        run: () => this.clearFilters(),
      },
      ...this.allRows().map<PaletteCommand>((g) => ({
        id: `guest.${g.id}`,
        label: $localize`:@@palette.openGuest:Open ${g.name}:name:`,
        hint: g.tableLabel || unseated,
        group: people,
        icon: 'users',
        keywords: [g.partyLabel, g.tableLabel, g.groupLabel, g.email].join(' '),
        run: () => this.openGuest(g.id),
      })),
    ];
  });

  // URL ---------------------------------------------------------------------------

  private navigate(params: Partial<Record<QueryKey, string | null>>, replaceUrl = false): void {
    const queryParams = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v === '' ? null : v]));
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl });
  }

  protected setSearch(value: string): void {
    this.navigate({ q: value }, true);
  }

  protected setFilter(key: 'group' | 'meal' | 'tag' | 'by', value: string): void {
    this.navigate({ [key]: key === 'by' && value === 'none' ? null : value });
  }

  protected setRsvpFilter(value: RsvpFilter | null): void {
    this.navigate({ rsvp: value === 'all' ? null : value });
  }

  protected setSort(sort: GridSort | null): void {
    this.navigate({ sort: formatSort(sort) });
  }

  protected setSortKey(key: string): void {
    const dir = this.query().sort?.dir ?? 'asc';
    this.setSort(key ? { key: key as SortKey, dir } : null);
  }

  protected flipSort(): void {
    const s = this.query().sort;
    if (s) this.setSort({ key: s.key, dir: s.dir === 'asc' ? 'desc' : 'asc' });
  }

  protected clearFilters(): void {
    this.navigate({ q: null, rsvp: null, group: null, meal: null, tag: null });
  }

  protected openGuest(id: string): void {
    this.navigate({ guest: id });
  }

  protected closePanel(): void {
    this.navigate({ guest: null });
  }

  // Edits -------------------------------------------------------------------------

  protected setRowRsvp(row: GuestRow, rsvp: Rsvp): void {
    if (row.rsvp === rsvp) return;
    const label = LABELS.setRsvp(row.name, rsvp);
    this.actions.run(
      command(label, (e) => setRsvp(e, [row.id], rsvp)),
      sentence(label),
    );
  }

  protected setRowMeal(row: GuestRow, meal: Meal): void {
    if (row.meal === meal) return;
    const label = LABELS.setMeal(row.name, meal);
    this.actions.run(
      command(label, (e) => updateGuest(e, row.id, { meal })),
      sentence(label),
    );
  }

  protected bulkRsvp(rsvp: Rsvp): void {
    const rows = this.selected();
    const label = LABELS.setRsvp(who(rows), rsvp);
    this.actions.run(
      command(label, (e) =>
        setRsvp(
          e,
          rows.map((r) => r.id),
          rsvp,
        ),
      ),
      sentence(label),
    );
  }

  protected bulkTag(tag: string): void {
    const rows = this.selected();
    const label = LABELS.addTag(who(rows), tag.toLowerCase());
    this.actions.run(
      command(label, (e) =>
        addTag(
          e,
          rows.map((r) => r.id),
          tag,
        ),
      ),
      sentence(label),
    );
  }

  protected bulkAssign(tableId: string): void {
    const rows = this.selected();
    const table = this.tables().find((t) => t.id === tableId);
    if (!table) return;
    const label = LABELS.assign(who(rows), table.label);
    this.actions.run(
      command(label, (e) =>
        assignTable(
          e,
          rows.map((r) => r.id),
          tableId,
        ),
      ),
      sentence(label),
    );
  }

  protected bulkRemove(): void {
    const rows = this.selected();
    this.confirmRemove.set(false);
    const label = LABELS.remove(who(rows));
    const result = this.actions.run(
      command(label, (e) =>
        removeGuests(
          e,
          rows.map((r) => r.id),
        ),
      ),
      sentence(label),
    );
    if (!result.ok) return;
    this.selection.set(new Set());
    // The Remove button went with the selection; carry on from the list.
    afterNextRender(
      () =>
        (this.grid()?.nativeElement as HTMLElement | undefined)?.querySelector<HTMLElement>('[role="grid"]')?.focus(),
      { injector: this.injector },
    );
  }

  // Labels for in-cell controls ----------------------------------------------------

  protected rsvpAria(row: GuestRow): string {
    return $localize`:@@guests.cell.rsvp:RSVP for ${row.name}:name:`;
  }

  protected mealAria(row: GuestRow): string {
    return $localize`:@@guests.cell.meal:Meal for ${row.name}:name:`;
  }

  protected plusOneText(row: GuestRow): string {
    return $localize`:@@guests.plusOneOf:Plus-one of ${row.plusOneOf ?? ''}:name:`;
  }

  protected moreTags(row: GuestRow): string {
    return `+${count(row.tags.length - 2)}`;
  }

  protected clearSelection(): void {
    this.selection.set(new Set());
  }

  protected readonly sortAscLabel = $localize`:@@guests.sortAsc:Sorted ascending. Switch to descending`;
  protected readonly sortDescLabel = $localize`:@@guests.sortDesc:Sorted descending. Switch to ascending`;
  protected readonly accessLabel = $localize`:@@guests.access:Needs step-free access`;
  protected readonly noTable = $localize`:@@guests.unseated:Unseated`;
}
