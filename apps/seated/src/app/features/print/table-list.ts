import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MEAL_LABEL, count } from '../../i18n/messages';
import { totalsText, type MealTotal, type TableBlock } from './print.vm';

/** The caterer's sheet: a summary of meals, then each table with its seats in order. */
@Component({
  selector: 'st-table-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="summary">
      <div>
        <h2 class="title st-display" i18n="@@print.listTitle">Table list · {{ eventName() }}</h2>
        <p class="sub st-mono">{{ subtitle() }}</p>
      </div>
      <dl class="totals" aria-label="Meals across all tables" i18n-aria-label="@@print.totalsLabel">
        @for (t of totals(); track t.meal) {
          <div>
            <dt>{{ t.label }}</dt>
            <dd class="st-num">{{ fmt(t.count) }}</dd>
          </div>
        }
      </dl>
    </header>

    <div class="tables">
      @for (b of blocks(); track b.id) {
        <section class="block" [attr.aria-labelledby]="'tl-' + b.id">
          <h3 class="block-head" [id]="'tl-' + b.id">
            <span class="label">{{ b.label }}</span>
            <span class="fill st-num">{{ b.seated }}/{{ b.capacity }}</span>
          </h3>
          <table>
            <thead class="st-sr-only">
              <tr>
                <th scope="col" i18n="@@print.colSeat">Seat</th>
                <th scope="col" i18n="@@print.colName">Name</th>
                <th scope="col" i18n="@@print.colMeal">Meal</th>
              </tr>
            </thead>
            <tbody>
              @for (r of b.rows; track r.seat) {
                <tr [class.empty]="!r.name">
                  <td class="n st-num">{{ r.seat }}</td>
                  <td>{{ r.name ?? emptyText }}</td>
                  <td class="meal">{{ r.meal ? mealLabel[r.meal] : '' }}</td>
                </tr>
              }
            </tbody>
          </table>
          <p class="meals st-mono">{{ text(b.meals) }}</p>
        </section>
      }
    </div>
  `,
  styleUrl: './table-list.scss',
})
export class TableList {
  readonly blocks = input.required<readonly TableBlock[]>();
  readonly totals = input.required<readonly MealTotal[]>();
  readonly eventName = input.required<string>();
  readonly subtitle = input.required<string>();

  protected readonly mealLabel = MEAL_LABEL;
  protected readonly emptyText = $localize`:@@print.emptySeat:Empty`;
  protected readonly fmt = count;
  protected readonly text = totalsText;
}
