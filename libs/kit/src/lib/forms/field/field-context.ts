import { InjectionToken, type Signal } from '@angular/core';

/**
 * What a form field shares with the control projected into it. The control
 * injects this (optionally) and binds its own id and ARIA from it, so the
 * wiring lives on the native element where assistive tech reads it.
 */
export interface StFieldContext {
  readonly controlId: Signal<string>;
  readonly describedBy: Signal<string | null>;
  readonly invalid: Signal<boolean>;
  readonly required: Signal<boolean>;
}

export const ST_FIELD = new InjectionToken<StFieldContext>('StFieldContext');

let nextId = 0;
/** Document-unique ids for labels, hints and errors. */
export function uniqueId(prefix: string): string {
  return `${prefix}-${++nextId}`;
}
