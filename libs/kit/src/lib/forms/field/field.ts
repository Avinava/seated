import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import { StIcon } from '../../icons/icon/icon';
import { ST_FIELD, uniqueId, type StFieldContext } from './field-context';

/**
 * A labelled form field. Project one `stInput` control; the field gives it an
 * id for the label, points aria-describedby at the hint and error, and sets
 * aria-invalid while there is an error. Errors sit in a polite live region.
 *
 * ```html
 * <st-field label="Email" hint="For the RSVP link" [error]="emailError()" required>
 *   <input stInput type="email" [(ngModel)]="email" />
 * </st-field>
 * ```
 */
@Component({
  selector: 'st-field',
  imports: [StIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: ST_FIELD, useExisting: StField }],
  host: {
    class: 'st-field',
    '[class.is-invalid]': 'invalid()',
  },
  template: `
    <label class="label" [for]="controlId()">
      {{ label() }}
      @if (required()) {
        <span class="required" aria-hidden="true">*</span>
      }
    </label>
    <ng-content />
    @if (hint()) {
      <p class="hint" [id]="hintId">{{ hint() }}</p>
    }
    <div class="error-region" aria-live="polite">
      @if (error()) {
        <p class="error" [id]="errorId"><st-icon name="alert" [size]="14" />{{ error() }}</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: 6px;
    }

    .label {
      color: var(--st-text);
      font-size: var(--st-fs-md);
      font-weight: 500;
    }

    .required {
      margin-left: 2px;
      color: var(--st-danger);
    }

    .hint {
      color: var(--st-text-3);
      font-size: var(--st-fs-sm);
    }

    .error {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--st-danger);
      font-size: var(--st-fs-sm);
      font-weight: 500;
    }

    .error-region:empty {
      display: none;
    }
  `,
})
export class StField implements StFieldContext {
  readonly label = input.required<string>();
  readonly hint = input<string>();
  /** Error message; when set the control is marked invalid. */
  readonly error = input<string | null>();
  readonly required = input(false, { transform: booleanAttribute });

  private readonly baseId = uniqueId('st-field');
  protected readonly hintId = `${this.baseId}-hint`;
  protected readonly errorId = `${this.baseId}-error`;

  readonly controlId = computed(() => `${this.baseId}-control`);
  readonly invalid = computed(() => !!this.error());
  readonly describedBy = computed(() => {
    const ids = [this.hint() ? this.hintId : null, this.error() ? this.errorId : null].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  });
}
