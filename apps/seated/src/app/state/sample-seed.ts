import { Injectable, inject } from '@angular/core';
import { CLOCK } from '../core/clock';
import { EventRepository } from '../core/storage/event-repository';

const SEEDED = 'seated.seeded';

/**
 * Adds the sample events the first time the app runs in a browser. Everything
 * that reads events waits for this, so a deep link to the sample wedding works
 * on a first visit too.
 */
@Injectable({ providedIn: 'root' })
export class SampleSeed {
  private readonly repo = inject(EventRepository);
  private readonly clock = inject(CLOCK);
  private done: Promise<void> | null = null;

  ready(): Promise<void> {
    this.done ??= this.seed();
    return this.done;
  }

  private async seed(): Promise<void> {
    if (seeded() || (await this.repo.list()).length > 0) return;
    const { createSampleEvents } = await import('@seated/domain/sample');
    await Promise.all(createSampleEvents(this.clock()).map((e) => this.repo.put(e)));
    markSeeded();
  }
}

function seeded(): boolean {
  try {
    return globalThis.localStorage?.getItem(SEEDED) === '1';
  } catch {
    return false;
  }
}

function markSeeded(): void {
  try {
    globalThis.localStorage?.setItem(SEEDED, '1');
  } catch {
    // Without storage the samples come back next visit, which is fine.
  }
}
