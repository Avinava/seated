import { ChangeDetectionStrategy, Component } from '@angular/core';
import { StButton, StPill, StSeat } from '@seated/kit';
import { BrandSection } from './brand-section';
import { swatchGroups, themeVars } from './brand.vm';

/**
 * Colour from the generated tokens, light and dark side by side. Each panel
 * re-declares every --st-* colour from COLOR_TOKENS, so the swatches and the
 * kit samples inside are the real thing, not pictures of it.
 */
@Component({
  selector: 'st-brand-colour',
  imports: [BrandSection, StButton, StPill, StSeat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-brand-section
      id="colour"
      num="02"
      heading="Colour"
      i18n-heading="@@brand.colour"
      intro="Quiet neutrals carry the interface so seat colours can do the work on the floor plan. Every colour has a dark twin; both come from design/tokens.json."
      i18n-intro="@@brand.colourIntro"
    >
      <div class="panels">
        @for (p of panels; track p.mode) {
          <section class="panel" [style]="p.vars" [attr.aria-labelledby]="'colour-' + p.mode">
            <header class="panel-head">
              <h3 [id]="'colour-' + p.mode">{{ p.title }}</h3>
              <!-- Samples to look at, not to use: inert keeps them out of the tab order and the accessibility tree. -->
              <span class="sample" inert>
                <button type="button" stButton variant="primary" size="sm" i18n="@@brand.sampleButton">
                  Seat them
                </button>
                <st-pill tone="1">{{ p.pill }}</st-pill>
                <!-- eslint-disable-next-line @angular-eslint/template/elements-content -- StSeat renders its label as text -->
                <button
                  stSeat
                  type="button"
                  state="picked"
                  initials="KM"
                  [tone]="2"
                  label="Sample seat"
                  i18n-label="@@brand.sampleSeat"
                ></button>
              </span>
            </header>
            @for (g of groups; track g.id) {
              <h4 class="group st-mono">{{ g.label }}</h4>
              <ul class="swatches">
                @for (t of g.tokens; track t.name) {
                  <li class="swatch">
                    <span class="chip" [style.background]="'var(' + t.cssVar + ')'" aria-hidden="true"></span>
                    <span class="name st-num">{{ t.cssVar }}</span>
                    <span class="value st-num">{{ p.mode === 'light' ? t.light : t.dark }}</span>
                    <span class="note">{{ t.note }}</span>
                  </li>
                }
              </ul>
            }
          </section>
        }
      </div>
    </st-brand-section>
  `,
  styles: `
    .panels {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: var(--st-space-4);
    }

    .panel {
      padding: var(--st-space-5);
      border: 1px solid var(--st-line);
      border-radius: var(--st-radius-2xl);
      background: var(--st-bg);
      color: var(--st-text);
    }

    .panel-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--st-space-3);
      margin-bottom: var(--st-space-2);
    }

    h3 {
      font-size: var(--st-fs-lg);
      font-weight: 600;
    }

    .sample {
      display: inline-flex;
      align-items: center;
      gap: var(--st-space-3);
    }

    .group {
      margin: var(--st-space-5) 0 var(--st-space-2);
      color: var(--st-text-3);
    }

    .swatches {
      display: grid;
      gap: 2px;
    }

    .swatch {
      display: grid;
      grid-template-columns: 28px minmax(0, 1fr) auto;
      grid-template-rows: auto auto;
      column-gap: var(--st-space-3);
      align-items: center;
      padding: 6px 0;
    }

    .chip {
      grid-row: span 2;
      width: 28px;
      height: 28px;
      border-radius: var(--st-radius-md);
      box-shadow: inset 0 0 0 1px var(--st-line-2);
    }

    .name {
      font-size: var(--st-fs-sm);
      font-weight: 500;
    }

    .value {
      color: var(--st-text-2);
      font-size: var(--st-fs-2xs);
      text-align: right;
    }

    .note {
      grid-column: 2 / -1;
      color: var(--st-text-3);
      font-size: var(--st-fs-xs);
    }
  `,
})
export class BrandColour {
  protected readonly groups = swatchGroups();
  protected readonly panels = [
    {
      mode: 'light',
      title: $localize`:@@brand.light:Light`,
      pill: $localize`:@@brand.pillBride:Bride's family`,
      vars: themeVars('light'),
    },
    {
      mode: 'dark',
      title: $localize`:@@brand.dark:Dark`,
      pill: $localize`:@@brand.pillBride2:Bride's family`,
      vars: themeVars('dark'),
    },
  ] as const;
}
