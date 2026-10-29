import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/** Online or offline, as the browser reports it. Everything still works offline; this only drives the banner. */
@Injectable({ providedIn: 'root' })
export class Connectivity {
  private readonly win = inject(DOCUMENT).defaultView;
  readonly online = signal(this.win?.navigator.onLine ?? true);

  constructor() {
    this.win?.addEventListener('online', () => this.online.set(true));
    this.win?.addEventListener('offline', () => this.online.set(false));
  }
}
