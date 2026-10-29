import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Injectable, inject } from '@angular/core';

export type Politeness = 'polite' | 'assertive';

/**
 * Speaks short status messages to screen readers ("Aarav Shah seated at T3,
 * seat 4"). A thin, app-facing wrapper over the CDK LiveAnnouncer that is
 * polite by default, so announcements queue behind what the user is hearing.
 */
@Injectable({ providedIn: 'root' })
export class Announcer {
  private readonly live = inject(LiveAnnouncer);

  /** Resolves once the message has been placed in the live region. */
  announce(message: string, politeness: Politeness = 'polite', duration?: number): Promise<void> {
    return this.live.announce(message, politeness, duration);
  }

  /** Assertive: interrupts. Reserve for errors the user must hear now. */
  alert(message: string): Promise<void> {
    return this.live.announce(message, 'assertive');
  }

  clear(): void {
    this.live.clear();
  }
}
