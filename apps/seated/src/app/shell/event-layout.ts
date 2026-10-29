import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { StButton, StEmptyState, StSkeleton } from '@seated/kit';
import { EventStore } from '../state/event-store';

/** Opens the event named in the URL and shows its screens once it has loaded. */
@Component({
  selector: 'st-event-layout',
  imports: [RouterOutlet, RouterLink, StButton, StEmptyState, StSkeleton],
  template: `
    @switch (store.status()) {
      @case ('ready') {
        <router-outlet />
      }
      @case ('missing') {
        <div class="state">
          <st-empty-state icon="calendar" heading="This event is not on this device" i18n-heading="@@event.missing">
            <p i18n="@@event.missingBody">
              Events live in the browser they were made in. Import an export file to bring one here.
            </p>
            <a actions stButton routerLink="/" i18n="@@event.backHome">Back to your events</a>
          </st-empty-state>
        </div>
      }
      @default {
        <div class="state" aria-busy="true">
          <span class="st-sr-only" i18n="@@event.loading">Loading the event</span>
          <st-skeleton width="240px" height="32px" />
          <st-skeleton shape="block" height="420px" />
        </div>
      }
    }
  `,
  styles: `
    .state {
      display: grid;
      gap: var(--st-space-4);
      padding: var(--st-space-8);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EventLayout {
  protected readonly store = inject(EventStore);
  /** Bound from the :eventId route param. */
  readonly eventId = input.required<string>();

  constructor() {
    effect(() => void this.store.open(this.eventId()));
  }
}
