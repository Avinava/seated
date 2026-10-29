import type { GuestId, RuleId, SeatingEvent } from '../model/types';

/** Why an edit could not be applied. Structured so the app can phrase it in any language. */
export type OpFailure =
  | { readonly ok: false; readonly reason: 'not-found'; readonly ids: readonly string[] }
  | { readonly ok: false; readonly reason: 'invalid'; readonly field: string }
  | { readonly ok: false; readonly reason: 'no-room'; readonly free: number }
  | { readonly ok: false; readonly reason: 'occupied'; readonly guestId: GuestId }
  | { readonly ok: false; readonly reason: 'duplicate'; readonly ruleId: RuleId };

export type OpFailureReason = OpFailure['reason'];

export type OpSuccess<X = unknown> = { readonly ok: true; readonly event: SeatingEvent } & X;

/** Every edit returns a new event or a typed failure; the input is never mutated. */
export type OpResult<X = unknown> = OpSuccess<X> | OpFailure;

export function ok(event: SeatingEvent): OpSuccess;
export function ok<X extends object>(event: SeatingEvent, extra: X): OpSuccess<X>;
export function ok<X extends object>(event: SeatingEvent, extra?: X): OpSuccess<X | unknown> {
  return { ok: true, event, ...extra };
}

export function notFound(ids: readonly string[]): OpFailure {
  return { ok: false, reason: 'not-found', ids };
}

export function invalid(field: string): OpFailure {
  return { ok: false, reason: 'invalid', field };
}

/**
 * Ops leave updatedAt alone so they stay pure and replayable; the caller stamps
 * the time once per user action with this helper.
 */
export function touch(event: SeatingEvent, now: string): SeatingEvent {
  return event.updatedAt === now ? event : { ...event, updatedAt: now };
}
