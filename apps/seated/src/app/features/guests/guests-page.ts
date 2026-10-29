import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'st-guests-page',
  template: '<h1 class="st-display">Guests</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class GuestsPage {}
