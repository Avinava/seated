import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'seated.theme';

/** Light, dark or follow the system. Remembered per browser; the page works without storage. */
@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly doc = inject(DOCUMENT);
  readonly preference = signal<ThemePreference>(read());

  /** The system setting, kept live so 'system' follows the OS. Light when there is no window (prerendering). */
  private readonly systemDark = signal(false);

  /** The theme actually showing. */
  readonly resolved = computed<'light' | 'dark'>(() => {
    const pref = this.preference();
    if (pref !== 'system') return pref;
    return this.systemDark() ? 'dark' : 'light';
  });

  constructor() {
    const query = this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
    if (query) {
      this.systemDark.set(query.matches);
      query.addEventListener('change', (e) => this.systemDark.set(e.matches));
    }

    effect(() => {
      const pref = this.preference();
      const root = this.doc.documentElement;
      if (pref === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', pref);
      write(pref);
    });
  }

  toggle(): void {
    this.preference.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }
}

function read(): ThemePreference {
  try {
    const v = globalThis.localStorage?.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function write(pref: ThemePreference): void {
  try {
    if (pref === 'system') globalThis.localStorage?.removeItem(KEY);
    else globalThis.localStorage?.setItem(KEY, pref);
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
}
