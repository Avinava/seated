import { ActiveDescendantKeyManager, CdkTrapFocus, type Highlightable } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  Injector,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StKbd } from '../../actions/kbd/kbd';
import { StIcon } from '../../icons/icon/icon';
import { filterPaletteItems, groupPaletteItems, type PaletteItem } from './palette-filter';

let nextId = 0;

/**
 * One option row. Focus never leaves the search input; the key manager marks
 * the active option and the input points at it with aria-activedescendant.
 */
@Directive({
  selector: '[stPaletteOption]',
  host: {
    role: 'option',
    '[id]': 'domId',
    '[attr.aria-selected]': 'active()',
    '[class.is-active]': 'active()',
    // Keep focus in the input when an option is clicked.
    '(mousedown)': '$event.preventDefault()',
    '(click)': 'chosen.emit(item())',
    '(pointermove)': 'onPointerMove()',
  },
})
export class StPaletteOption implements Highlightable {
  readonly item = input.required<PaletteItem>({ alias: 'stPaletteOption' });
  readonly chosen = output<PaletteItem>();
  readonly hovered = output<StPaletteOption>();

  readonly domId = `st-palette-option-${nextId++}`;
  readonly active = signal(false);
  readonly disabled = false;
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onPointerMove(): void {
    if (!this.active()) this.hovered.emit(this);
  }

  setActiveStyles(): void {
    this.active.set(true);
    this.el.nativeElement.scrollIntoView?.({ block: 'nearest' });
  }

  setInactiveStyles(): void {
    this.active.set(false);
  }

  getLabel(): string {
    return this.item().label;
  }
}

/**
 * The command palette: a modal search box over a grouped list of commands.
 * Implements the ARIA combobox pattern with a listbox popup; Up/Down move the
 * active option, Enter runs it, Escape closes. Matching is substring plus word
 * initials ("asg" finds "Auto-seat guests"), see `filterPaletteItems`.
 *
 * ```html
 * <st-command-palette [(open)]="paletteOpen" [items]="commands" (run)="runCommand($event)" />
 * ```
 */
@Component({
  selector: 'st-command-palette',
  imports: [CdkTrapFocus, StIcon, StKbd, StPaletteOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-command-palette',
    '(click)': 'onHostClick($event)',
  },
  templateUrl: './command-palette.html',
  styleUrl: './command-palette.scss',
})
export class StCommandPalette {
  readonly open = model(false);
  readonly items = input<readonly PaletteItem[]>([]);
  readonly placeholder = input($localize`:@@st.palette.placeholder:Search guests, tables and commands`);
  readonly label = input($localize`:@@st.palette.label:Command palette`);
  /** Emits the id of the command the user chose. The palette closes itself. */
  readonly run = output<string>();
  /** Emits whenever the palette closes, whether or not a command ran. */
  readonly closed = output();

  protected readonly query = signal('');
  protected readonly results = computed(() => filterPaletteItems(this.items(), this.query()));
  protected readonly groups = computed(() => groupPaletteItems(this.results()));
  protected readonly activeId = signal<string | null>(null);
  /** Result count for screen readers, announced as the query changes. */
  protected readonly status = computed(() => {
    if (!this.query().trim()) return '';
    const n = this.results().length;
    if (n === 0) return $localize`:@@st.palette.none:No matches`;
    return n === 1 ? $localize`:@@st.palette.one:1 result` : $localize`:@@st.palette.many:${n}:count: results`;
  });

  private readonly uid = nextId++;
  protected readonly inputId = `st-palette-input-${this.uid}`;
  protected readonly listId = `st-palette-list-${this.uid}`;
  protected readonly groupId = (index: number) => `st-palette-group-${this.uid}-${index}`;

  private readonly options = viewChildren(StPaletteOption);
  private readonly keys = new ActiveDescendantKeyManager(this.options, inject(Injector)).withWrap().withPageUpDown();

  constructor() {
    this.keys.change.pipe(takeUntilDestroyed()).subscribe(() => this.activeId.set(this.keys.activeItem?.domId ?? null));

    // When the rendered options change, the best match becomes active. Comparing ids
    // means a re-emitted but identical list never undoes an arrow-key move.
    let shown = '';
    effect(() => {
      const options = this.options();
      untracked(() => {
        const ids = options.map((o) => o.item().id).join('\n');
        if (ids === shown) return;
        shown = ids;
        if (options.length) this.keys.setFirstItemActive();
        else {
          this.keys.setActiveItem(-1);
          this.activeId.set(null);
        }
      });
    });

    // Every opening starts from an empty search.
    effect(() => {
      if (this.open()) untracked(() => this.query.set(''));
    });
  }

  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.closed.emit();
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.close();
        return;
      case 'Enter': {
        const active = this.keys.activeItem;
        if (active) {
          event.preventDefault();
          this.choose(active.item());
        }
        return;
      }
      // Dispatch on `key` rather than the CDK's legacy keyCode check, so synthetic
      // events from assistive tech and test drivers behave like real ones.
      case 'ArrowDown':
        event.preventDefault();
        this.keys.setNextItemActive();
        return;
      case 'ArrowUp':
        event.preventDefault();
        this.keys.setPreviousItemActive();
        return;
      case 'PageDown':
      case 'PageUp':
        this.keys.onKeydown(event);
        return;
    }
  }

  protected choose(item: PaletteItem): void {
    this.run.emit(item.id);
    this.close();
  }

  protected hover(option: StPaletteOption): void {
    if (this.keys.activeItem !== option) this.keys.setActiveItem(option);
  }

  protected onHostClick(event: MouseEvent): void {
    if ((event.target as Element | null)?.classList.contains('scrim')) this.close();
  }
}
