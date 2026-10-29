import type { GuestId, Rule, RuleId, SeatingEvent } from '../model/types';
import { nextIdFor } from './ids';
import { invalid, notFound, ok, type OpResult } from './result';

/** A rule before it has an id. */
export type RuleDraft = { [K in Rule['kind']]: Omit<Extract<Rule, { kind: K }>, 'id'> }[Rule['kind']];

/** True when two rules say the same thing (apart is order-insensitive). */
export function sameRule(a: RuleDraft, b: RuleDraft): boolean {
  switch (a.kind) {
    case 'apart':
      return (
        b.kind === 'apart' &&
        ((a.guests[0] === b.guests[0] && a.guests[1] === b.guests[1]) ||
          (a.guests[0] === b.guests[1] && a.guests[1] === b.guests[0]))
      );
    case 'together':
      return b.kind === 'together' && a.partyId === b.partyId;
    case 'near-exit':
      return b.kind === 'near-exit' && a.guestId === b.guestId;
  }
}

export function addRule(event: SeatingEvent, draft: RuleDraft): OpResult<{ readonly id: RuleId }> {
  const guestIds = new Set(event.guests.map((g) => g.id));
  switch (draft.kind) {
    case 'apart': {
      const [a, b] = draft.guests;
      if (a === b) return invalid('guests');
      const missing = [a, b].filter((id) => !guestIds.has(id));
      if (missing.length > 0) return notFound(missing);
      break;
    }
    case 'together':
      if (!event.parties.some((p) => p.id === draft.partyId)) return notFound([draft.partyId]);
      break;
    case 'near-exit':
      if (!guestIds.has(draft.guestId)) return notFound([draft.guestId]);
      break;
  }
  const existing = event.rules.find((r) => sameRule(r, draft));
  if (existing) return { ok: false, reason: 'duplicate', ruleId: existing.id };
  const id = nextIdFor('rule', event.rules);
  return ok({ ...event, rules: [...event.rules, { ...draft, id } as Rule] }, { id });
}

export function removeRule(event: SeatingEvent, ruleId: RuleId): OpResult {
  if (!event.rules.some((r) => r.id === ruleId)) return notFound([ruleId]);
  return ok({ ...event, rules: event.rules.filter((r) => r.id !== ruleId) });
}

/** Keep near-exit rules in step with guests' access flags. */
export function syncAccessRule(event: SeatingEvent, guestId: GuestId, access: boolean): SeatingEvent {
  const has = event.rules.some((r) => r.kind === 'near-exit' && r.guestId === guestId);
  if (access && !has) {
    const id = nextIdFor('rule', event.rules);
    return { ...event, rules: [...event.rules, { id, kind: 'near-exit', guestId }] };
  }
  if (!access && has) {
    return { ...event, rules: event.rules.filter((r) => !(r.kind === 'near-exit' && r.guestId === guestId)) };
  }
  return event;
}
