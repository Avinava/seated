import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import { MEAL_LABEL } from '../../i18n/messages';
import { MEAL_CODE, type PlaceCard } from './print.vm';

/**
 * Tent cards, 3.5 by 2 inches (7:4) when folded flat, two across an A4 page.
 * The top half is the back of the tent; the name reads on the front.
 */
@Component({
  selector: 'st-place-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="cards">
      @for (c of cards(); track c.key) {
        <li class="card">
          <div class="back" aria-hidden="true"><span class="fold st-mono" i18n="@@print.fold">Fold</span></div>
          <div class="front">
            <p class="name st-display">{{ c.name }}</p>
            <p class="where st-mono">
              <span i18n="@@print.cardWhere">{{ c.table }} · Seat {{ c.seat }}</span>
              @if (showMeal()) {
                <span class="meal" [attr.data-meal]="c.meal">
                  <span aria-hidden="true">{{ code[c.meal] }}</span>
                  <span class="st-sr-only">{{ label[c.meal] }}</span>
                </span>
              }
            </p>
          </div>
        </li>
      }
    </ul>
  `,
  styles: `
    .cards {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0;
    }

    .card {
      display: grid;
      grid-template-rows: 1fr 1fr;
      aspect-ratio: 7 / 4;
      border: 1px dashed var(--st-line-2);
      margin: 0 -1px -1px 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .back {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 4px;
      border-bottom: 1px dashed var(--st-line-2);
    }

    .fold {
      color: var(--st-text-3);
      font-size: var(--st-fs-2xs);
      letter-spacing: 0.14em;
    }

    .front {
      display: grid;
      align-content: center;
      justify-items: center;
      gap: 6px;
      padding: 0 var(--st-space-4);
      text-align: center;
    }

    .name {
      max-width: 100%;
      overflow: hidden;
      font-size: clamp(var(--st-fs-xl), 3.4vw, var(--st-fs-3xl));
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .where {
      display: flex;
      align-items: center;
      gap: var(--st-space-2);
      color: var(--st-text-2);
    }

    .meal {
      display: inline-grid;
      place-items: center;
      min-width: 22px;
      height: 18px;
      padding: 0 4px;
      border: 1px solid currentColor;
      border-radius: var(--st-radius-pill);
      font-size: var(--st-fs-2xs);
    }

    @media print {
      .card {
        width: 3.5in;
        height: 2in;
        aspect-ratio: auto;
        border-color: black;
      }

      .cards {
        grid-template-columns: repeat(2, 3.5in);
        justify-content: center;
      }

      .back {
        border-color: black;
      }

      .fold,
      .where {
        color: black;
      }

      .name {
        font-size: 24pt;
      }
    }
  `,
})
export class PlaceCards {
  readonly cards = input.required<readonly PlaceCard[]>();
  readonly showMeal = input(false, { transform: booleanAttribute });
  protected readonly code = MEAL_CODE;
  protected readonly label = MEAL_LABEL;
}
