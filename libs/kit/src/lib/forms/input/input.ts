import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { ST_FIELD, uniqueId } from '../field/field-context';

/**
 * Kit styling for native text inputs, selects and textareas. Inside an
 * `st-field` it also takes its id, aria-describedby, aria-invalid and required
 * state from the field, so the label, hint and error are wired with no extra
 * markup.
 *
 * ```html
 * <input stInput type="search" placeholder="Find a guest" aria-label="Find a guest" />
 * ```
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- styles the native control in place
  selector: 'input[stInput], select[stInput], textarea[stInput]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Styles target the host element itself; emulation would add nothing but attributes.
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'st-input',
    '[id]': 'resolvedId()',
    '[attr.aria-describedby]': 'field?.describedBy() ?? null',
    '[attr.aria-invalid]': 'isInvalid() ? "true" : null',
    '[attr.aria-required]': 'field?.required() ? "true" : null',
  },
  // Projection keeps a select's options (and a textarea's text) in place.
  template: '<ng-content />',
  styleUrl: './input.scss',
})
export class StInput {
  protected readonly field = inject(ST_FIELD, { optional: true });

  /**
   * The native control. A template ref (`#email`) on this element resolves to
   * the component, so read the control through here: `email.element.value`.
   */
  readonly element =
    inject<ElementRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>>(ElementRef).nativeElement;

  /** Optional explicit id; inside a field the field's id is used. */
  readonly id = input<string>();
  /** Mark invalid outside a field (inside one, the field's error decides). */
  readonly invalid = input(false, { transform: booleanAttribute });

  private readonly ownId = uniqueId('st-input');
  protected readonly resolvedId = computed(() => this.field?.controlId() ?? this.id() ?? this.ownId);
  protected readonly isInvalid = computed(() => this.field?.invalid() || this.invalid());
}
