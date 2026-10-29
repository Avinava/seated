import { ChangeDetectionStrategy, Component, booleanAttribute, input, model } from '@angular/core';

/**
 * A native checkbox with the kit's look. Supports the indeterminate state
 * (announced as "mixed"); any user toggle clears it. The label is projected;
 * use `ariaLabel` when there is no visible label (a grid's select-all box).
 *
 * ```html
 * <st-checkbox [(checked)]="vegOnly">Vegetarian only</st-checkbox>
 * ```
 */
@Component({
  selector: 'st-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-checkbox',
    '[class.is-disabled]': 'disabled()',
  },
  template: `
    <label>
      <span class="box">
        <input
          type="checkbox"
          [checked]="checked()"
          [indeterminate]="indeterminate()"
          [disabled]="disabled()"
          [attr.aria-label]="ariaLabel() || null"
          (change)="onChange($event)"
        />
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          @if (indeterminate()) {
            <path d="M4 8h8" />
          } @else {
            <path d="m3.5 8.5 3 3 6-7" />
          }
        </svg>
      </span>
      <span class="label"><ng-content /></span>
    </label>
  `,
  styleUrl: './checkbox.scss',
})
export class StCheckbox {
  readonly checked = model(false);
  readonly indeterminate = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Accessible name when the checkbox has no projected label. */
  readonly ariaLabel = input<string>();

  protected onChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.indeterminate.set(false);
    this.checked.set(el.checked);
  }
}
