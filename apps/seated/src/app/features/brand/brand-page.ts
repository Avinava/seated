import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'st-brand-page',
  template: '<h1 class="st-display">Brand kit</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BrandPage {}
