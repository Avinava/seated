import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * A keyboard shortcut hint. Pass `keys` as a "+" separated combo ("Mod+K")
 * where `Mod` renders as the platform's command key, or project free text.
 *
 * ```html
 * <st-kbd keys="Mod+K" />  <st-kbd>Esc</st-kbd>
 * ```
 */
@Component({
  selector: 'st-kbd',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'st-kbd' },
  template: `
    @if (parts().length) {
      <kbd>
        @for (k of parts(); track $index) {
          <kbd aria-hidden="true">{{ k }}</kbd>
        }
        <span class="st-sr-only">{{ spoken() }}</span>
      </kbd>
    } @else {
      <kbd
        ><kbd><ng-content /></kbd
      ></kbd>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    kbd {
      display: inline-flex;
      gap: 2px;
      font: inherit;
    }

    kbd kbd {
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border: 1px solid var(--st-line);
      border-bottom-width: 2px;
      border-radius: var(--st-radius-sm);
      background: var(--st-surface);
      color: var(--st-text-2);
      font-family: var(--st-font-mono);
      font-size: var(--st-fs-2xs);
      line-height: 1;
      letter-spacing: 0.02em;
    }
  `,
})
export class StKbd {
  /** A "+" separated combo, e.g. "Mod+Shift+Z". `Mod` is the platform's command key. */
  readonly keys = input<string>('');

  private readonly mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  protected readonly parts = computed(() =>
    this.keys()
      .split('+')
      .map((k) => k.trim())
      .filter(Boolean)
      .map((k) => (k === 'Mod' ? (this.mac ? '⌘' : 'Ctrl') : k === 'Shift' && this.mac ? '⇧' : k)),
  );

  /** Screen readers hear "Command K" rather than a glyph. */
  protected readonly spoken = computed(() =>
    this.keys()
      .split('+')
      .map((k) => k.trim())
      .filter(Boolean)
      .map((k) => (k === 'Mod' ? (this.mac ? 'Command' : 'Control') : k))
      .join(' '),
  );
}
