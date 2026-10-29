import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'st-share-page',
  template: '<h1 class="st-display">Share</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SharePage {}
