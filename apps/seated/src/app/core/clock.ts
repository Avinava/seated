import { InjectionToken } from '@angular/core';

/** Current time. Tests and screenshots replace it so dates and countdowns are stable. */
export const CLOCK = new InjectionToken<() => Date>('CLOCK', { factory: () => () => new Date() });
