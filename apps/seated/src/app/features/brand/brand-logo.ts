import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Logo } from '../../shell/logo';
import { BrandSection } from './brand-section';
import { themeVars } from './brand.vm';

@Component({
  selector: 'st-brand-logo',
  imports: [BrandSection, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-brand-section
      id="logo"
      num="01"
      heading="Logo"
      i18n-heading="@@brand.logo"
      intro="The mark is a round table seen from above with six seats. The lit seat is always you: the guest looking for a place, or the host planning one. Keep one seat-width of clear space around it."
      i18n-intro="@@brand.logoIntro"
    >
      <div class="lockups">
        <figure>
          <div class="tile" [style]="light">
            <span class="lockup"><st-logo [size]="40" /><span class="word st-display">Seated</span></span>
          </div>
          <figcaption i18n="@@brand.primary">Primary lockup, on light</figcaption>
        </figure>
        <figure>
          <div class="tile" [style]="dark">
            <span class="lockup"><st-logo [size]="40" /><span class="word st-display">Seated</span></span>
          </div>
          <figcaption i18n="@@brand.onDark">On dark</figcaption>
        </figure>
        <figure>
          <div class="tile accent">
            <span class="lockup on-accent"><st-logo [size]="40" /><span class="word st-display">Seated</span></span>
          </div>
          <figcaption i18n="@@brand.onAccent">On accent: the lit seat turns solid</figcaption>
        </figure>
      </div>
      <div class="sizes">
        @for (s of sizes; track s) {
          <figure class="size">
            <st-logo [size]="s" />
            <figcaption class="st-num">{{ s }}</figcaption>
          </figure>
        }
      </div>
    </st-brand-section>
  `,
  styles: `
    .lockups {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--st-space-4);
    }

    figure {
      display: grid;
      gap: var(--st-space-2);
    }

    figcaption {
      color: var(--st-text-3);
      font-size: var(--st-fs-sm);
    }

    .tile {
      display: grid;
      place-items: center;
      height: 160px;
      border: 1px solid var(--st-line);
      border-radius: var(--st-radius-xl);
      background: var(--st-bg);
      color: var(--st-text);
    }

    .tile.accent {
      border-color: transparent;
      background: var(--st-accent);
    }

    .on-accent {
      --st-text: var(--st-on-accent);
      --st-accent: var(--st-on-accent);
      color: var(--st-on-accent);
    }

    .lockup {
      display: inline-flex;
      align-items: center;
      gap: var(--st-space-3);
    }

    .word {
      font-size: var(--st-fs-3xl);
    }

    .sizes {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--st-space-8);
      margin-top: var(--st-space-6);
    }

    .size {
      justify-items: center;
    }
  `,
})
export class BrandLogo {
  protected readonly light = themeVars('light');
  protected readonly dark = themeVars('dark');
  protected readonly sizes = [16, 24, 32, 48, 64];
}
