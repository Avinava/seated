import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, output } from '@angular/core';
import { StIcon } from '../../icons/icon/icon';
import { toTone, toneVars, type StTone, type StToneInput } from '../../shared/tone';

/**
 * A tag chip ("vip", "kids table") with an optional remove button. The remove
 * button is a real button named after the chip, and also answers Backspace and
 * Delete so a row of chips can be pruned from the keyboard.
 *
 * ```html
 * <st-chip label="vip" (removed)="dropTag('vip')" />
 * ```
 */
@Component({
  selector: 'st-chip',
  imports: [StIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-chip',
    '[class.is-removable]': 'removable()',
    '[attr.data-tone]': 'tone()',
    '[style.--_soft]': 'vars().soft',
  },
  template: `
    <span class="label">{{ label() }}</span>
    @if (removable()) {
      <button
        type="button"
        class="remove"
        [attr.aria-label]="removeLabel()"
        (click)="removed.emit()"
        (keydown.backspace)="removed.emit()"
        (keydown.delete)="removed.emit()"
      >
        <st-icon name="x" [size]="12" [strokeWidth]="2" />
      </button>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      height: 24px;
      padding: 0 9px;
      border: 1px solid var(--st-line);
      border-radius: var(--st-radius-pill);
      background: var(--st-surface);
      color: var(--st-text);
      font-size: var(--st-fs-sm);
      line-height: 1;
      white-space: nowrap;
    }

    :host(.is-removable) {
      padding-right: 3px;
    }

    .remove {
      position: relative;
      display: inline-grid;
      place-items: center;
      width: 18px;
      height: 18px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--st-text-3);
      transition:
        background-color var(--st-dur-fast) var(--st-ease-settle),
        color var(--st-dur-fast) var(--st-ease-settle);
    }

    .remove::after {
      content: '';
      position: absolute;
      inset: -6px;
    }

    .remove:hover {
      background: var(--st-surface-3);
      color: var(--st-text);
    }

    :host(:not([data-tone='neutral'])) {
      border-color: transparent;
      background: var(--_soft);
    }
  `,
})
export class StChip {
  readonly label = input.required<string>();
  readonly removable = input(true, { transform: booleanAttribute });
  readonly tone = input<StTone, StToneInput>('neutral', { transform: toTone });
  /** Emitted when the user asks to remove the chip (click, Backspace or Delete). */
  readonly removed = output();

  protected readonly vars = computed(() => toneVars(this.tone()));
  protected readonly removeLabel = computed(() => $localize`:@@stChip.remove:Remove ${this.label()}:label:`);
}
