import { type DestroyRef, Injectable, computed, signal, type Signal } from '@angular/core';
import type { PaletteItem } from '@seated/kit';

/** A palette entry plus what it does. */
export interface PaletteCommand extends PaletteItem {
  readonly run: () => void;
}

/**
 * What the ⌘K palette lists. The shell registers navigation and app actions;
 * each screen registers its own while it is open (e.g. seating adds "Auto-seat",
 * guests adds a jump to every guest), and they disappear with the screen.
 */
@Injectable({ providedIn: 'root' })
export class PaletteRegistry {
  private readonly sources = signal<readonly Signal<readonly PaletteCommand[]>[]>([]);
  readonly open = signal(false);

  readonly commands = computed(() => this.sources().flatMap((s) => s()));
  readonly items = computed<PaletteItem[]>(() => this.commands().map(({ run: _run, ...item }) => item));

  register(commands: Signal<readonly PaletteCommand[]>, destroyRef: DestroyRef): void {
    this.sources.update((s) => [...s, commands]);
    destroyRef.onDestroy(() => this.sources.update((s) => s.filter((x) => x !== commands)));
  }

  run(id: string): void {
    this.commands()
      .find((c) => c.id === id)
      ?.run();
  }
}
