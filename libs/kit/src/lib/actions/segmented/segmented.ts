import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  input,
  model,
  viewChildren,
} from '@angular/core';

export interface SegmentedOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
  /** Optional count shown in mono after the label, e.g. guests per RSVP state. */
  readonly count?: number;
}

/**
 * A single-choice segmented control with radio-group semantics: one tab stop,
 * arrow keys move and select (wrapping), Home and End jump to the ends.
 *
 * ```html
 * <st-segmented aria-label="RSVP" [options]="rsvpOptions" [(value)]="rsvp" />
 * ```
 */
@Component({
  selector: 'st-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-segmented',
    role: 'radiogroup',
    '[attr.aria-label]': 'label()',
    '(keydown)': 'onKeydown($event)',
  },
  template: `
    @for (o of options(); track o.value; let i = $index) {
      <button
        #seg
        type="button"
        role="radio"
        class="seg"
        [attr.aria-checked]="o.value === value()"
        [tabIndex]="i === focusIndex() ? 0 : -1"
        (click)="select(o.value)"
      >
        <span>{{ o.label }}</span>
        @if (o.count !== undefined) {
          <span class="count">{{ o.count }}</span>
        }
      </button>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 2px;
      padding: 3px;
      border-radius: var(--st-radius-md);
      background: var(--st-surface-2);
    }

    .seg {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: calc(var(--st-size-control) - 6px);
      padding: 0 var(--st-space-3);
      border: 0;
      border-radius: var(--st-radius-sm);
      background: transparent;
      color: var(--st-text-2);
      font-size: var(--st-fs-md);
      font-weight: 500;
      white-space: nowrap;
      transition:
        background-color var(--st-dur-fast) var(--st-ease-settle),
        color var(--st-dur-fast) var(--st-ease-settle),
        box-shadow var(--st-dur-fast) var(--st-ease-settle);
    }

    .seg:hover {
      color: var(--st-text);
    }

    .seg[aria-checked='true'] {
      background: var(--st-surface);
      color: var(--st-text);
      box-shadow: var(--st-shadow-small);
    }

    .count {
      font-family: var(--st-font-mono);
      font-size: var(--st-fs-2xs);
      letter-spacing: var(--st-tracking-mono);
      color: var(--st-text-3);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class StSegmented<T extends string = string> {
  readonly options = input.required<readonly SegmentedOption<T>[]>();
  readonly value = model<T | null>(null);
  /** Accessible name for the group. */
  // eslint-disable-next-line @angular-eslint/no-input-rename -- the native attribute is the API, and requiring it makes an unnamed control a compile error
  readonly label = input.required<string>({ alias: 'aria-label' });

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('seg');

  private readonly selectedIndex = computed(() => this.options().findIndex((o) => o.value === this.value()));
  /** The roving tab stop: the checked option, or the first one when nothing is checked. */
  protected readonly focusIndex = computed(() => Math.max(0, this.selectedIndex()));

  protected select(value: T): void {
    this.value.set(value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.options().length;
    if (!count) return;
    const current = this.focusIndex();
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % count;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + count) % count;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }
    const option = this.options()[next];
    if (!option) return;
    event.preventDefault();
    this.value.set(option.value);
    this.buttons()[next]?.nativeElement.focus();
  }
}
