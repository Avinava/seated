import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toTone, toneVars, type StTone, type StToneInput } from '../../shared/tone';

export type AvatarSize = 'sm' | 'md' | 'lg';

/**
 * Initials in a tinted circle, matching how a guest looks in a seat. Decorative
 * next to a visible name; pass `label` when it stands alone.
 *
 * ```html
 * <st-avatar initials="AS" tone="1" />
 * ```
 */
@Component({
  selector: 'st-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-avatar',
    '[attr.data-size]': 'size()',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': 'label() ? null : "true"',
    '[style.--_fg]': 'vars().fg',
    '[style.--_soft]': 'vars().soft',
  },
  template: `{{ shown() }}`,
  styles: `
    :host {
      --_d: var(--st-size-seat);
      display: inline-grid;
      place-items: center;
      width: var(--_d);
      height: var(--_d);
      flex: none;
      border: 1.5px solid var(--_fg);
      border-radius: 50%;
      background: var(--_soft);
      color: var(--st-text);
      font-family: var(--st-font-mono);
      font-size: var(--st-fs-2xs);
      font-weight: 500;
      letter-spacing: 0.02em;
      line-height: 1;
      text-transform: uppercase;
      user-select: none;
    }

    :host([data-size='sm']) {
      --_d: 24px;
      font-size: 9.5px;
    }

    :host([data-size='lg']) {
      --_d: var(--st-size-control-lg);
      font-size: var(--st-fs-xs);
    }
  `,
})
export class StAvatar {
  readonly initials = input.required<string>();
  readonly tone = input<StTone, StToneInput>('neutral', { transform: toTone });
  readonly size = input<AvatarSize>('md');
  /** Accessible name when the avatar is not next to a visible name. */
  readonly label = input<string>();

  protected readonly vars = computed(() => toneVars(this.tone()));
  /** At most two characters fit a seat-sized circle. */
  protected readonly shown = computed(() => this.initials().trim().slice(0, 2));
}
