import { Directive, TemplateRef, inject, input } from '@angular/core';
import type { GridColumn, GridRow } from './grid-types';

export interface StCellContext<T> {
  /** The data row. */
  readonly $implicit: T;
  /** Position among data rows (group rows excluded). */
  readonly index: number;
}

/**
 * Custom cell template for one column of `st-data-grid`. Pass the grid's rows
 * with `of` to type the row variable:
 *
 * ```html
 * <ng-container *stCell="'name'; of: guests; let guest">{{ guest.name }}</ng-container>
 * ```
 */
@Directive({ selector: '[stCell]' })
export class StCell<T = unknown> {
  /** The column key this template renders. */
  readonly stCell = input.required<string>();
  /** The grid's rows. Only used to infer the row type for the template. */
  readonly stCellOf = input<readonly GridRow<T>[]>();

  readonly template = inject<TemplateRef<StCellContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(_dir: StCell<T>, _ctx: unknown): _ctx is StCellContext<T> {
    return true;
  }
}

export interface StHeaderCellContext {
  readonly $implicit: GridColumn;
}

/**
 * Custom header content for one column. Sorting, `aria-sort` and the sort
 * button stay with the grid; this only replaces the label.
 */
@Directive({ selector: '[stHeaderCell]' })
export class StHeaderCell {
  readonly stHeaderCell = input.required<string>();
  readonly template = inject<TemplateRef<StHeaderCellContext>>(TemplateRef);

  static ngTemplateContextGuard(_dir: StHeaderCell, _ctx: unknown): _ctx is StHeaderCellContext {
    return true;
  }
}
