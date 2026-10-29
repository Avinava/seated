import { ChangeDetectionStrategy, Component } from '@angular/core';
import { StSeat, StTable } from '@seated/kit';
import { BrandSection } from './brand-section';
import { SEAT_SAMPLES, TABLE_SAMPLES } from './brand.vm';

@Component({
  selector: 'st-brand-seating',
  imports: [BrandSection, StSeat, StTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-brand-section
      id="seating"
      num="04"
      heading="Seats and tables"
      i18n-heading="@@brand.seating"
      intro="Border, ring and size change together, so colour is never the only signal. Seats are 30px with a 40px hit area, the same as the gap between them."
      i18n-intro="@@brand.seatingIntro"
    >
      <ul class="states">
        @for (s of seats; track s.state) {
          <li class="state">
            <div class="stage">
              <!-- eslint-disable-next-line @angular-eslint/template/elements-content -- StSeat renders its label as text -->
              <button
                stSeat
                type="button"
                [state]="s.state"
                [initials]="s.initials"
                [tone]="s.state === 'empty' || s.state === 'drop-target' ? null : 3"
                [label]="s.title"
              ></button>
            </div>
            <p class="title">{{ s.title }}</p>
            <p class="signal">{{ s.signal }}</p>
          </li>
        }
      </ul>

      <ul class="tables">
        @for (t of tables; track t.shape) {
          <li class="table">
            <div class="stage big">
              <st-table [shape]="t.shape" [label]="t.label" [seats]="t.seats" />
            </div>
            <p class="signal">{{ t.caption }}</p>
          </li>
        }
      </ul>
    </st-brand-section>
  `,
  styles: `
    .states {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: var(--st-space-3);
    }

    .state,
    .table {
      display: grid;
      align-content: start;
      gap: var(--st-space-1);
    }

    .stage {
      display: grid;
      place-items: center;
      height: 96px;
      margin-bottom: var(--st-space-2);
      border: 1px solid var(--st-line);
      border-radius: var(--st-radius-xl);
      background:
        radial-gradient(circle, var(--st-dot) 1px, transparent 1.5px) 0 0 / 16px 16px,
        var(--st-surface);
    }

    .stage.big {
      height: 260px;
      overflow: auto;
    }

    .title {
      font-weight: 600;
    }

    .signal {
      color: var(--st-text-3);
      font-size: var(--st-fs-sm);
      text-wrap: pretty;
    }

    .tables {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: var(--st-space-4);
      margin-top: var(--st-space-8);
    }
  `,
})
export class BrandSeating {
  protected readonly seats = SEAT_SAMPLES;
  protected readonly tables = TABLE_SAMPLES;
}
