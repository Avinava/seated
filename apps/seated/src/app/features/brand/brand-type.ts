import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BrandSection } from './brand-section';
import { radiusSteps, typeSteps } from './brand.vm';

@Component({
  selector: 'st-brand-type',
  imports: [BrandSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-brand-section
      id="type"
      num="03"
      heading="Type"
      i18n-heading="@@brand.type"
      intro="Three families, one job each. Bricolage Grotesque gives event names warmth without turning formal; Geist keeps dense tables calm; Geist Mono lines up counts, seats and dates."
      i18n-intro="@@brand.typeIntro"
    >
      <div class="roles">
        <div class="role">
          <div class="meta">
            <p class="family" i18n="@@brand.displayFamily">Bricolage Grotesque</p>
            <p class="use st-mono" i18n="@@brand.displayUse">Display · 600 · headings, event names, place cards</p>
          </div>
          <p class="st-display specimen-display" i18n="@@brand.displaySample">Find your seat</p>
        </div>
        <div class="role">
          <div class="meta">
            <p class="family" i18n="@@brand.uiFamily">Geist</p>
            <p class="use st-mono" i18n="@@brand.uiUse">Interface · 400 to 600 · labels, tables, forms</p>
          </div>
          <div>
            <p class="specimen-ui" i18n="@@brand.uiSample">
              Kamla Mehta moved to T4. The Mehtas are seated together beside the exit.
            </p>
            <p class="weights">
              <span class="w400" i18n="@@brand.regular">Regular</span>
              <span class="w500" i18n="@@brand.medium">Medium</span>
              <span class="w600" i18n="@@brand.semibold">Semibold</span>
            </p>
          </div>
        </div>
        <div class="role">
          <div class="meta">
            <p class="family" i18n="@@brand.monoFamily">Geist Mono</p>
            <p class="use st-mono" i18n="@@brand.monoUse">Data · counts, seats, dates</p>
          </div>
          <p class="st-mono specimen-mono" i18n="@@brand.monoSample">84 / 104 seated · T4 · seat 7 · 18 Dec</p>
        </div>
      </div>

      <h3 class="sub" i18n="@@brand.scale">Scale</h3>
      <ul class="scale">
        @for (s of steps; track s.name) {
          <li>
            <span class="label st-num">{{ s.name }} · {{ s.size }}</span>
            <span class="text" [style.font-size]="'var(' + s.cssVar + ')'" i18n="@@brand.scaleSample"
              >Ananya &amp; Kabir</span
            >
          </li>
        }
      </ul>

      <h3 class="sub" i18n="@@brand.radii">Radii</h3>
      <ul class="radii">
        @for (r of radii; track r.name) {
          <li>
            <span class="box" [style.border-radius]="'var(' + r.cssVar + ')'" aria-hidden="true"></span>
            <span class="label st-num">{{ r.name }} · {{ r.value }}</span>
          </li>
        }
      </ul>
    </st-brand-section>
  `,
  styles: `
    .roles {
      border: 1px solid var(--st-line);
      border-radius: var(--st-radius-2xl);
      background: var(--st-surface);
    }

    .role {
      display: grid;
      grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
      gap: var(--st-space-6);
      align-items: center;
      padding: var(--st-space-6);
    }

    .role + .role {
      border-top: 1px solid var(--st-line);
    }

    @media (max-width: 720px) {
      .role {
        grid-template-columns: 1fr;
      }
    }

    .family {
      font-weight: 600;
    }

    .use,
    .label {
      color: var(--st-text-3);
      font-size: var(--st-fs-xs);
    }

    .specimen-display {
      font-size: var(--st-fs-5xl);
    }

    .specimen-ui {
      font-size: var(--st-fs-xl);
      text-wrap: pretty;
    }

    .weights {
      display: flex;
      gap: var(--st-space-4);
      margin-top: var(--st-space-2);
      color: var(--st-text-2);
    }

    .w400 {
      font-weight: 400;
    }

    .w500 {
      font-weight: 500;
    }

    .w600 {
      font-weight: 600;
    }

    .specimen-mono {
      font-size: var(--st-fs-lg);
    }

    .sub {
      margin: var(--st-space-8) 0 var(--st-space-3);
      font-size: var(--st-fs-lg);
      font-weight: 600;
    }

    .scale li {
      display: grid;
      grid-template-columns: 120px minmax(0, 1fr);
      gap: var(--st-space-4);
      align-items: baseline;
      padding: var(--st-space-1) 0;
      border-bottom: 1px solid var(--st-line);
    }

    .text {
      overflow: hidden;
      line-height: 1.2;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .radii {
      display: flex;
      flex-wrap: wrap;
      gap: var(--st-space-6);
    }

    .radii li {
      display: grid;
      justify-items: center;
      gap: var(--st-space-2);
    }

    .box {
      width: 64px;
      height: 64px;
      border: 1.5px solid var(--st-text-2);
      background: var(--st-surface-2);
    }
  `,
})
export class BrandType {
  protected readonly steps = typeSteps();
  protected readonly radii = radiusSteps();
}
