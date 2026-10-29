import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A phone-shaped frame for live previews. The content scrolls inside the screen. */
@Component({
  selector: 'st-phone-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'region', '[attr.aria-label]': 'label()' },
  template: `
    <div class="device">
      <div class="status st-num" aria-hidden="true">
        <span>7:42</span>
        <span class="island"></span>
        <span>5G</span>
      </div>
      <div class="screen"><ng-content /></div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .device {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 360px;
      height: 700px;
      margin: 0 auto;
      padding: var(--st-space-3);
      border: 1px solid var(--st-line-2);
      border-radius: 44px;
      background: var(--st-surface-3);
      box-shadow: var(--st-shadow-raised);
    }

    .status {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 36px;
      padding: 0 var(--st-space-5);
      border-radius: 32px 32px 0 0;
      background: var(--st-bg);
      color: var(--st-text);
      font-size: var(--st-fs-xs);
      font-weight: 600;
    }

    .island {
      width: 84px;
      height: 22px;
      border-radius: var(--st-radius-pill);
      background: var(--st-text);
    }

    .screen {
      flex: 1;
      overflow-y: auto;
      padding: var(--st-space-4) var(--st-space-5) var(--st-space-6);
      border-radius: 0 0 32px 32px;
      background: var(--st-bg);
      overscroll-behavior: contain;
    }
  `,
})
export class PhoneFrame {
  readonly label = input.required<string>();
}
