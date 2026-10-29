import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, type Provider } from '@angular/core';
import { EventRepository } from './event-repository';
import { IdbRepository } from './idb-repository';
import { MemoryRepository } from './memory-repository';

/** IndexedDB in the browser; memory when prerendering or when IndexedDB is unavailable. */
export function provideStorage(): Provider {
  return {
    provide: EventRepository,
    useFactory: (platform: object) =>
      isPlatformBrowser(platform) && typeof indexedDB !== 'undefined' ? new IdbRepository() : new MemoryRepository(),
    deps: [PLATFORM_ID],
  };
}
