import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { StCommandPalette, StIcon, StIconButton, StKbd, StToastHost, type IconName } from '@seated/kit';
import { Connectivity } from '../core/connectivity';
import { Hotkeys } from '../core/hotkeys';
import { Theme } from '../core/theme';
import { localDate } from '../core/dates';
import { count } from '../i18n/messages';
import { Actions } from '../state/actions';
import { EventStore } from '../state/event-store';
import { EventsStore } from '../state/events-store';
import { Logo } from './logo';
import { PaletteRegistry, type PaletteCommand } from './palette-registry';

interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
  readonly meta?: string;
}

/**
 * The frame around every organiser screen: sidebar, command palette, toasts
 * and the offline notice. App-wide shortcuts live here.
 */
@Component({
  selector: 'st-app-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    DatePipe,
    StIcon,
    StIconButton,
    StKbd,
    StCommandPalette,
    StToastHost,
    Logo,
  ],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
  protected readonly store = inject(EventStore);
  protected readonly events = inject(EventsStore);
  protected readonly theme = inject(Theme);
  protected readonly connectivity = inject(Connectivity);
  protected readonly palette = inject(PaletteRegistry);
  protected readonly hotkeys = inject(Hotkeys);
  private readonly actions = inject(Actions);
  private readonly router = inject(Router);

  protected readonly event = this.store.doc;
  protected readonly eventDate = computed(() => {
    const e = this.event();
    return e ? localDate(e.date) : null;
  });

  protected readonly nav = computed<NavItem[]>(() => {
    const e = this.event();
    if (!e) return [];
    const base = `/events/${e.id}`;
    return [
      { path: `${base}/guests`, label: $localize`:@@nav.guests:Guests`, icon: 'users', meta: count(e.guests.length) },
      {
        path: `${base}/seating`,
        label: $localize`:@@nav.seating:Seating`,
        icon: 'table',
        meta: `${count(this.store.seatedCount())}/${count(this.store.comingCount())}`,
      },
      { path: `${base}/import`, label: $localize`:@@nav.import:Import`, icon: 'upload' },
      { path: `${base}/share`, label: $localize`:@@nav.share:Share`, icon: 'share' },
      { path: `${base}/print`, label: $localize`:@@nav.print:Print`, icon: 'printer' },
    ];
  });

  protected readonly themeLabel = computed(() =>
    this.theme.resolved() === 'dark'
      ? $localize`:@@shell.toLight:Switch to light`
      : $localize`:@@shell.toDark:Switch to dark`,
  );

  protected readonly saveLabel = computed(() => {
    switch (this.store.save()) {
      case 'saving':
        return $localize`:@@save.saving:Saving`;
      case 'error':
        return $localize`:@@save.error:Not saved. Storage is unavailable.`;
      default:
        return $localize`:@@save.saved:Saved on this device`;
    }
  });

  private readonly shellCommands = computed<PaletteCommand[]>(() => {
    const go = $localize`:@@palette.navigate:Navigate`;
    const act = $localize`:@@palette.actions:Actions`;
    const app = $localize`:@@palette.app:App`;
    const nav: PaletteCommand[] = [
      {
        id: 'nav.home',
        label: $localize`:@@palette.home:Your events`,
        group: go,
        icon: 'home',
        run: () => this.go('/'),
      },
      ...this.nav().map((n) => ({
        id: `nav.${n.path}`,
        label: n.label,
        group: go,
        icon: n.icon,
        run: () => this.go(n.path),
      })),
      ...this.events
        .sorted()
        .filter((e) => e.id !== this.event()?.id)
        .map((e) => ({
          id: `event.${e.id}`,
          label: e.name,
          hint: $localize`:@@palette.switchEvent:Switch event`,
          group: go,
          icon: 'calendar' as const,
          run: () => this.go(`/events/${e.id}/seating`),
        })),
    ];
    const history: PaletteCommand[] = [];
    const undo = this.store.undoLabel();
    if (undo) {
      history.push({
        id: 'history.undo',
        label: $localize`:@@palette.undo:Undo ${undo}:label:`,
        group: act,
        icon: 'undo',
        shortcut: 'Mod+Z',
        run: () => this.actions.undo(),
      });
    }
    const redo = this.store.redoLabel();
    if (redo) {
      history.push({
        id: 'history.redo',
        label: $localize`:@@palette.redo:Redo ${redo}:label:`,
        group: act,
        icon: 'redo',
        shortcut: 'Mod+Shift+Z',
        run: () => this.actions.redo(),
      });
    }
    return [
      ...nav,
      ...history,
      {
        id: 'app.theme',
        label: $localize`:@@palette.theme:Switch light or dark`,
        group: app,
        icon: this.theme.resolved() === 'dark' ? 'sun' : 'moon',
        run: () => this.theme.toggle(),
      },
      {
        id: 'app.brand',
        label: $localize`:@@palette.brand:Open the brand kit`,
        group: app,
        icon: 'sparkles',
        run: () => this.go('/brand'),
      },
    ];
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Storage lives in the browser; the prerendered shell shows skeletons until this runs.
    afterNextRender(() => void this.events.load());
    this.palette.register(this.shellCommands, destroyRef);
    this.hotkeys.on('mod+k', () => this.palette.open.update((o) => !o), destroyRef);
    this.hotkeys.on('mod+z', () => this.actions.undo(), destroyRef);
    this.hotkeys.on('mod+shift+z', () => this.actions.redo(), destroyRef);
    this.hotkeys.on('mod+y', () => this.actions.redo(), destroyRef);

    // Keep the event list (home cards, switcher) in step with edits to the open event.
    effect(() => {
      const e = this.event();
      if (e) untracked(() => this.events.sync(e));
    });
  }

  protected runCommand(id: string): void {
    this.palette.open.set(false);
    this.palette.run(id);
  }

  private go(path: string): void {
    void this.router.navigateByUrl(path);
  }
}
