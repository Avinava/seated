import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StButton, StEmptyState } from '@seated/kit';

@Component({
  selector: 'st-not-found-page',
  imports: [RouterLink, StButton, StEmptyState],
  template: `
    <st-empty-state icon="map-pin" heading="Nothing at this address" i18n-heading="@@notFound.heading">
      <p i18n="@@notFound.body">The link may be old, or the event may live in another browser.</p>
      <a actions stButton routerLink="/" i18n="@@notFound.home">Go to your events</a>
    </st-empty-state>
  `,
  styles: `
    :host {
      display: block;
      padding: var(--st-space-12) var(--st-space-6);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NotFoundPage {}
