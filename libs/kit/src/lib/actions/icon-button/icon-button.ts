import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StIcon } from '../../icons/icon/icon';
import { type IconName } from '../../icons/icon/icons';

export type IconButtonVariant = 'ghost' | 'secondary' | 'primary';
export type IconButtonSize = 'sm' | 'md' | 'lg';

/**
 * A square, icon-only button. The accessible name is a required input, so an
 * unlabelled icon button fails to compile rather than failing an audit.
 * Pass `pressed` to make it a toggle (announced via aria-pressed).
 *
 * ```html
 * <button stIconButton icon="undo" aria-label="Undo"></button>
 * ```
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- native host keeps button semantics
  selector: 'button[stIconButton]',
  imports: [StIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-icon-button',
    '[attr.aria-label]': 'label()',
    '[attr.title]': 'label()',
    '[attr.aria-pressed]': 'pressed() ?? null',
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
  },
  template: `<st-icon [name]="icon()" [size]="size() === 'sm' ? 14 : 16" />`,
  styles: `
    :host {
      --_size: var(--st-size-control);
      position: relative;
      display: inline-grid;
      place-items: center;
      width: var(--_size);
      height: var(--_size);
      padding: 0;
      border: 1px solid transparent;
      border-radius: var(--st-radius-md);
      background: transparent;
      color: var(--st-text-2);
      cursor: pointer;
      transition:
        background-color var(--st-dur-fast) var(--st-ease-settle),
        color var(--st-dur-fast) var(--st-ease-settle),
        border-color var(--st-dur-fast) var(--st-ease-settle);
    }

    :host::after {
      content: '';
      position: absolute;
      inset: 50% auto auto 50%;
      width: max(100%, var(--st-size-target));
      height: max(100%, var(--st-size-target));
      transform: translate(-50%, -50%);
    }

    :host(:hover) {
      background: var(--st-surface-2);
      color: var(--st-text);
    }

    :host([data-size='sm']) {
      --_size: var(--st-size-control-sm);
    }

    :host([data-size='lg']) {
      --_size: var(--st-size-control-lg);
    }

    :host([data-variant='secondary']) {
      border-color: var(--st-line);
      background: var(--st-surface);
      color: var(--st-text);
    }

    :host([data-variant='secondary']:hover) {
      border-color: var(--st-line-2);
    }

    :host([data-variant='primary']) {
      background: var(--st-text);
      color: var(--st-bg);
    }

    :host([aria-pressed='true']) {
      border-color: var(--st-line);
      background: var(--st-surface-3);
      color: var(--st-text);
    }

    :host(:disabled) {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }
  `,
})
export class StIconButton {
  readonly icon = input.required<IconName>();
  /** Required accessible name, also shown as a tooltip. */
  // eslint-disable-next-line @angular-eslint/no-input-rename -- the native attribute is the API, and requiring it makes an unnamed control a compile error
  readonly label = input.required<string>({ alias: 'aria-label' });
  readonly variant = input<IconButtonVariant>('ghost');
  readonly size = input<IconButtonSize>('md');
  /** Set to true or false to make this a toggle button; leave undefined for a plain action. */
  readonly pressed = input<boolean | undefined>(undefined);
}
