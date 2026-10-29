import { ChangeDetectionStrategy, Component, booleanAttribute, input, model } from '@angular/core';

/**
 * An on/off switch for settings that apply immediately ("Show seat numbers").
 * A native button with role=switch; the projected label is its name.
 *
 * ```html
 * <st-switch [(checked)]="showNumbers">Show seat numbers</st-switch>
 * ```
 */
@Component({
  selector: 'st-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'st-switch' },
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="checked()"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel() || null"
      (click)="toggle()"
    >
      <span class="track" aria-hidden="true"><span class="thumb"></span></span>
      <span class="label"><ng-content /></span>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    button {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: var(--st-space-2);
      min-height: 24px;
      padding: 0;
      border: 0;
      background: none;
      color: var(--st-text);
      font-size: var(--st-fs-md);
      text-align: left;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .track {
      position: relative;
      width: 30px;
      height: 18px;
      flex: none;
      border-radius: var(--st-radius-pill);
      background: var(--st-text-3);
      transition: background-color var(--st-dur-base) var(--st-ease-settle);
    }

    .thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--st-surface);
      box-shadow: var(--st-shadow-small);
      transition: transform var(--st-dur-base) var(--st-ease-spring);
    }

    [aria-checked='true'] .track {
      background: var(--st-accent);
    }

    [aria-checked='true'] .thumb {
      transform: translateX(12px);
    }

    .label:empty {
      display: none;
    }
  `,
})
export class StSwitch {
  readonly checked = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Accessible name when there is no projected label. */
  readonly ariaLabel = input<string>();

  protected toggle(): void {
    this.checked.update((v) => !v);
  }
}
