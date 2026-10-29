import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'seated.theme';

/** Light, dark or follow the system. Remembered per browser; the page works without storage. */
@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly doc = inject(DOCUMENT);
  readonly preference = signal<ThemePreference>(read());

  constructor() {
    effect(() => {
      const pref = this.preference();
      const root = this.doc.documentElement;
      if (pref === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', pref);
      write(pref);
    });
  }

  /** The theme actually showing, resolving 'system' through the media query. */
  resolved(): 'light' | 'dark' {
    const pref = this.preference();
    if (pref !== 'system') return pref;
    return this.doc.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
