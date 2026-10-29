import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'st-import-page',
  template: '<h1 class="st-display">Import guests</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ImportPage {}
