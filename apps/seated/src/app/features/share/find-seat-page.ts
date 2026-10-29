import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'st-find-seat-page',
  template: '<h1 class="st-display">Find your seat</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FindSeatPage {}
