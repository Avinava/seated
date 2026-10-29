import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import { toTone, toneVars, type StTone, type StToneInput } from '../../shared/tone';

/**
 * A compact label: a status, a group, a meal. Tone tints the background and
 * adds a dot, but the text always carries the meaning, so colour is never the
 * only signal.
 *
 * ```html
 * <st-pill tone="2">Groom's side</st-pill>
 * <st-pill tone="danger">Declined</st-pill>
 * ```
 */
@Component({
  selector: 'st-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-pill',
    '[attr.data-tone]': 'tone()',
    '[class.is-mono]': 'mono()',
    '[style.--_fg]': 'vars().fg',
    '[style.--_soft]': 'vars().soft',
  },
  template: `
    @if (tone() !== 'neutral') {
      <span class="dot" aria-hidden="true"></span>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 22px;
      padding: 0 9px;
      border-radius: var(--st-radius-pill);
      background: var(--_soft);
      color: var(--st-text-2);
      font-size: var(--st-fs-sm);
      font-weight: 500;
      line-height: 1;
      white-space: nowrap;
    }

    :host([data-tone='neutral']) {
      background: var(--st-surface-2);
    }

    :host(.is-mono) {
      font-family: var(--st-font-mono);
      font-size: var(--st-fs-2xs);
      letter-spacing: var(--st-tracking-mono);
      text-transform: uppercase;
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--_fg);
      flex: none;
    }
  `,
})
export class StPill {
  readonly tone = input<StTone, StToneInput>('neutral', { transform: toTone });
  /** Mono caps style, for counts and codes. */
  readonly mono = input(false, { transform: booleanAttribute });

  protected readonly vars = computed(() => toneVars(this.tone()));
}
