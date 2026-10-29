import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { type Guest, type TableId, type TableShape } from '@seated/domain';
import { StBar, StButton, StDrawer, StIcon, StIconButton, StKbd, StPill, StSegmented, StSkeleton } from '@seated/kit';
import { map } from 'rxjs';
import { Hotkeys } from '../../core/hotkeys';
import { count, plural } from '../../i18n/messages';
import { PaletteRegistry, type PaletteCommand } from '../../shell/palette-registry';
import { Actions } from '../../state/actions';
import { EventStore } from '../../state/event-store';
import { AddTableMenu } from './add-table-menu';
import { FloorPlan } from './floor-plan';
import { SeatingCommands } from './seating-commands';
import { SeatingDrag } from './seating-drag';
import { SeatingRail } from './seating-rail';
import { SeatingStore } from './seating.store';
import { COLOR_OPTIONS, dropPreview, spokenTableName } from './seating.vm';
import { UnseatedList } from './unseated-list';

/** Below this width the right rail becomes a drawer; below the second, the unseated list does too. */
const RAIL_QUERY = '(max-width: 1359.98px)';
const LIST_QUERY = '(max-width: 759.98px)';

/**
 * The seating screen: who still needs a seat on the left, the floor plan in
 * the middle, rules and details on the right. Pointer and keyboard reach the
 * same commands. View state lives in a page-scoped SeatingStore; the event
 * changes only through undoable commands (SeatingCommands).
 */
@Component({
  selector: 'st-seating-page',
  imports: [
    StBar,
    StButton,
    StDrawer,
    StIcon,
    StIconButton,
    StKbd,
    StPill,
    StSegmented,
    StSkeleton,
    AddTableMenu,
    FloorPlan,
    SeatingRail,
    UnseatedList,
  ],
  providers: [SeatingStore, SeatingCommands, SeatingDrag],
  templateUrl: './seating-page.html',
  styleUrl: './seating-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-dragging]': 'view.dragging() !== null' },
})
export default class SeatingPage {
  protected readonly events = inject(EventStore);
  protected readonly view = inject(SeatingStore);
  protected readonly commands = inject(SeatingCommands);
  protected readonly actions = inject(Actions);
  private readonly drag = inject(SeatingDrag);
  private readonly hotkeys = inject(Hotkeys);
  private readonly palette = inject(PaletteRegistry);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly railCollapsed = this.matches(RAIL_QUERY);
  protected readonly listCollapsed = this.matches(LIST_QUERY);
  protected readonly colorOptions = COLOR_OPTIONS;

  protected readonly subtitle = computed(() => {
    const doc = this.events.doc();
    if (!doc) return '';
    const tables = doc.tables.length;
    const seats = doc.tables.reduce((n, t) => n + t.seats, 0);
    return $localize`:@@seating.subtitle:${doc.venue}:venue: · ${count(tables)}:tables: ${plural(tables, 'table', 'tables')}:tablesWord: · ${count(seats)}:seats: seats`;
  });

  protected readonly seatedLabel = computed(
    () =>
      $localize`:@@seating.seated:${count(this.events.seatedCount())}:seated:/${count(this.events.comingCount())}:coming: seated`,
  );

  protected readonly chooseLabel = $localize`:@@hold.choose:Choose a seat.`;
  protected readonly undoLabel = computed(() => {
    const l = this.events.undoLabel();
    return l ? $localize`:@@seating.undo:Undo ${l}:label:` : $localize`:@@seating.noUndo:Nothing to undo`;
  });
  protected readonly redoLabel = computed(() => {
    const l = this.events.redoLabel();
    return l ? $localize`:@@seating.redo:Redo ${l}:label:` : $localize`:@@seating.noRedo:Nothing to redo`;
  });

  protected readonly conflicts = computed(() => this.events.report()?.counts.conflict ?? 0);
  protected readonly conflictLabel = computed(() => {
    const n = this.conflicts();
    return n === 1 ? $localize`:@@seating.conflictOne:1 conflict` : $localize`:@@seating.conflicts:${n}:n: conflicts`;
  });

  /** The bar shown while something is held: who, and what dropping on the focused seat would do. */
  protected readonly holding = computed(() => {
    const held = this.view.held();
    if (!held) return null;
    const n = held.guestIds.length;
    const target = this.view.targetSeat();
    const doc = this.events.doc();
    let hint: string | null = null;
    if (target && doc) {
      const preview = dropPreview(doc, held, target);
      const table = this.events.tablesById().get(target.tableId)?.label ?? '';
      if (!preview.ok) {
        hint =
          preview.free === null
            ? $localize`:@@hold.taken:That seat is taken`
            : $localize`:@@hold.noRoom:Only ${preview.free}:free: free at ${table}:table:`;
      }
    }
    return { label: held.label, count: n, hint };
  });

  /** The chip that follows the pointer while a seated guest is dragged. */
  protected readonly chip = computed(() => {
    const d = this.view.dragging();
    const p = this.view.pointer();
    return d?.from && p ? { label: d.label, x: p.x, y: p.y } : null;
  });

  private readonly paletteCommands = computed<PaletteCommand[]>(() => {
    const doc = this.events.doc();
    if (!doc) return [];
    const group = $localize`:@@palette.seating:Seating`;
    const find = $localize`:@@palette.findGroup:Find a guest`;
    const go = $localize`:@@palette.tables:Tables`;
    const tables = this.events.tablesById();
    return [
      {
        id: 'seating.auto',
        label: $localize`:@@palette.auto:Auto-seat`,
        group,
        icon: 'sparkles',
        run: () => this.commands.autoSeat(),
      },
      {
        id: 'seating.add-round',
        label: $localize`:@@palette.addRound:Add round table`,
        group,
        icon: 'plus',
        run: () => this.addTable('round'),
      },
      {
        id: 'seating.fit',
        label: $localize`:@@palette.fit:Fit plan`,
        group,
        icon: 'maximize',
        shortcut: '0',
        run: () => this.view.zoomToFit(),
      },
      ...doc.guests
        .filter((g) => g.rsvp !== 'declined')
        .map((g): PaletteCommand => ({
          id: `seating.find.${g.id}`,
          label: $localize`:@@palette.find:Find ${g.name}:name:`,
          hint: g.seat ? (tables.get(g.seat.tableId)?.label ?? '') : $localize`:@@palette.unseated:Unseated`,
          group: find,
          icon: 'search',
          run: () => this.findGuest(g),
        })),
      ...doc.tables.map((t): PaletteCommand => ({
        id: `seating.table.${t.id}`,
        label: $localize`:@@palette.goTable:Go to ${t.label}:table:`,
        hint: spokenTableName(t.label),
        group: go,
        icon: 'table',
        run: () => this.goToTable(t.id),
      })),
    ];
  });

  constructor() {
    this.palette.register(this.paletteCommands, this.destroyRef);

    const zoomIn = () => this.view.zoomIn();
    this.hotkeys.on('+', zoomIn, this.destroyRef);
    this.hotkeys.on('shift++', zoomIn, this.destroyRef);
    this.hotkeys.on('=', zoomIn, this.destroyRef);
    this.hotkeys.on('-', () => this.view.zoomOut(), this.destroyRef);
    this.hotkeys.on('0', () => this.view.zoomToFit(), this.destroyRef);

    // Escape belongs to the page only while something is held, so it never swallows other uses.
    effect((onCleanup) => {
      if (!this.view.payload()) return;
      const off = this.hotkeys.on('escape', () => this.commands.cancel(), undefined, true);
      onCleanup(off);
    });

    effect(() => {
      const plan = this.events.doc()?.plan;
      if (plan) untracked(() => this.view.setPlan(plan.width, plan.height));
    });

    // On narrow screens, show the summary as soon as auto-seat runs and the list when a guest is named.
    effect(() => {
      if (this.view.summary() && untracked(this.railCollapsed)) untracked(() => this.view.setRailOpen(true));
    });
    effect(() => {
      if (this.view.focusGuestId() && untracked(this.listCollapsed)) {
        untracked(() => {
          this.view.setRailOpen(false);
          this.view.setListOpen(true);
        });
      }
    });
  }

  protected addTable(shape: TableShape): void {
    const id = this.commands.addTable(shape);
    if (id) setTimeout(() => this.drag.focusTable(id));
  }

  /** Select a guest's table and focus their seat, or bring them up in the unseated list. */
  private findGuest(g: Guest): void {
    if (g.seat) {
      const seat = g.seat;
      this.view.select(seat.tableId);
      this.view.highlightRule(null, [], null);
      setTimeout(() => this.drag.focusSeat(seat));
    } else {
      this.view.focusGuest(null);
      this.view.focusGuest(g.id);
    }
  }

  private goToTable(id: TableId): void {
    this.view.select(id);
    setTimeout(() => this.drag.focusTable(id));
  }

  private matches(query: string) {
    return toSignal(this.breakpoints.observe(query).pipe(map((r) => r.matches)), {
      initialValue: this.breakpoints.isMatched(query),
    });
  }
}
