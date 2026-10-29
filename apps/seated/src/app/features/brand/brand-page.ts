import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { StButton, StIcon } from '@seated/kit';
import { Theme } from '../../core/theme';
import { Logo } from '../../shell/logo';
import { BrandColour } from './brand-colour';
import { BrandControls } from './brand-controls';
import { BrandLogo } from './brand-logo';
import { BrandSeating } from './brand-seating';
import { BrandStates } from './brand-states';
import { BrandType } from './brand-type';

/**
 * The brand kit: a living style guide built from the real kit components and
 * the generated tokens, so it can never drift from the product. The full
 * component catalogue is the Storybook published alongside the app.
 */
@Component({
  selector: 'st-brand-page',
  imports: [BrandColour, BrandControls, BrandLogo, BrandSeating, BrandStates, BrandType, Logo, StButton, StIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="hero">
        <div class="bar">
          <p class="st-mono eyebrow" i18n="@@brand.eyebrow">Brand kit · v1.0</p>
          <div class="links">
            <button type="button" stButton variant="ghost" size="sm" (click)="theme.toggle()">
              <st-icon [name]="theme.resolved() === 'dark' ? 'sun' : 'moon'" />
              <span>{{ themeLabel() }}</span>
            </button>
            <a stButton size="sm" href="kit/">
              <span i18n="@@brand.storybook">Browse the full kit</span>
              <st-icon name="chevron-right" />
            </a>
          </div>
        </div>
        <h1 class="lockup">
          <st-logo [size]="64" />
          <span class="word st-display">Seated</span>
          <span class="st-sr-only" i18n="@@brand.h1">brand kit</span>
        </h1>
        <p class="lede" i18n="@@brand.lede">
          Seated plans who's coming, what they eat and where they sit. The identity starts from what every event shares:
          a round table seen from above, with one seat lit for you.
        </p>
      </header>

      <st-brand-logo />
      <st-brand-colour />
      <st-brand-type />
      <st-brand-seating />
      <st-brand-controls />
      <st-brand-states />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .page {
      max-width: 1120px;
      padding: var(--st-space-8);
    }

    @media (max-width: 720px) {
      .page {
        padding: var(--st-space-6) var(--st-space-4);
      }
    }

    .hero {
      display: grid;
      gap: var(--st-space-6);
      padding-bottom: var(--st-space-10);
    }

    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--st-space-3);
    }

    .eyebrow {
      color: var(--st-text-3);
    }

    .links {
      display: flex;
      gap: var(--st-space-2);
    }

    .lockup {
      display: flex;
      align-items: center;
      gap: var(--st-space-4);
    }

    .word {
      font-size: var(--st-fs-5xl);
    }

    .lede {
      max-width: 56ch;
      color: var(--st-text-2);
      font-size: var(--st-fs-xl);
      text-wrap: pretty;
    }
  `,
})
export default class BrandPage {
  protected readonly theme = inject(Theme);
  protected readonly themeLabel = computed(() =>
    this.theme.resolved() === 'dark' ? $localize`:@@brand.toLight:Light theme` : $localize`:@@brand.toDark:Dark theme`,
  );
}
