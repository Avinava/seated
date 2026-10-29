import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'st-events-page',
  template: '<h1 class="st-display">Your events</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EventsPage {}
