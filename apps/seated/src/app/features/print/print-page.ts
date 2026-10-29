import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'st-print-page',
  template: '<h1 class="st-display">Print</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PrintPage {}
