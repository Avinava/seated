import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'st-seating-page',
  template: '<h1 class="st-display">Seating</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SeatingPage {}
