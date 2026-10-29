import { isNearExit } from '../model/queries';
import type { Guest, GuestId, Rule, RuleId, RuleKind, SeatingEvent, Table, TableId } from '../model/types';

/** The implicit rule every table carries: no more guests than seats. */
export interface CapacityRule {
  readonly id: RuleId;
  readonly kind: 'capacity';
  readonly tableId: TableId;
}

export type AnyRule = Rule | CapacityRule;

export type RuleStatus = 'met' | 'waiting' | 'conflict';

export interface RuleCheck {
  readonly rule: AnyRule;
  readonly status: RuleStatus;
  /** Guests the rule is about (for capacity: the guests over the limit). */
  readonly guestIds: readonly GuestId[];
  /** Tables those guests sit at, in table order. */
  readonly tableIds: readonly TableId[];
}

export interface RuleReport {
  readonly checks: readonly RuleCheck[];
  readonly conflicts: readonly RuleCheck[];
  readonly byRule: ReadonlyMap<RuleId, RuleCheck>;
  readonly conflictsByGuest: ReadonlyMap<GuestId, readonly RuleId[]>;
  readonly conflictsByTable: ReadonlyMap<TableId, readonly RuleId[]>;
  readonly counts: Readonly<Record<RuleStatus, number>>;
}

export function capacityRuleId(tableId: TableId): RuleId {
  return `capacity:${tableId}`;
}

export function capacityRules(event: SeatingEvent): CapacityRule[] {
  return event.tables.map((t) => ({ id: capacityRuleId(t.id), kind: 'capacity', tableId: t.id }));
}

interface Ctx {
  readonly guests: ReadonlyMap<GuestId, Guest>;
  readonly tables: readonly Table[];
  readonly event: SeatingEvent;
}

function tablesOf(ctx: Ctx, guests: readonly Guest[]): TableId[] {
  const ids = new Set(guests.map((g) => g.seat?.tableId).filter((id) => id !== undefined));
  return ctx.tables.filter((t) => ids.has(t.id)).map((t) => t.id);
}

/** Guests a rule names who are still coming. Declined or deleted guests drop out. */
function attending(ctx: Ctx, ids: readonly GuestId[]): Guest[] {
  return ids.map((id) => ctx.guests.get(id)).filter((g): g is Guest => g !== undefined && g.rsvp !== 'declined');
}

function checkApart(ctx: Ctx, rule: Extract<Rule, { kind: 'apart' }>): RuleCheck {
  const people = attending(ctx, rule.guests);
  const guestIds = [...rule.guests];
  const tableIds = tablesOf(ctx, people);
  if (people.length < 2) return { rule, status: 'met', guestIds, tableIds };
  const [a, b] = people;
  if (!a?.seat || !b?.seat) return { rule, status: 'waiting', guestIds, tableIds };
  const status = a.seat.tableId === b.seat.tableId ? 'conflict' : 'met';
  return { rule, status, guestIds, tableIds };
}

function checkTogether(ctx: Ctx, rule: Extract<Rule, { kind: 'together' }>): RuleCheck {
  const members = ctx.event.guests.filter((g) => g.partyId === rule.partyId && g.rsvp !== 'declined');
  const guestIds = members.map((g) => g.id);
  const tableIds = tablesOf(ctx, members);
  if (tableIds.length > 1) return { rule, status: 'conflict', guestIds, tableIds };
  const status = members.some((g) => g.seat === null) ? 'waiting' : 'met';
  return { rule, status, guestIds, tableIds };
}

function checkNearExit(ctx: Ctx, rule: Extract<Rule, { kind: 'near-exit' }>): RuleCheck {
  const [g] = attending(ctx, [rule.guestId]);
  const guestIds = [rule.guestId];
  if (!g) return { rule, status: 'met', guestIds, tableIds: [] };
  const tableIds = tablesOf(ctx, [g]);
  if (!g.seat) return { rule, status: 'waiting', guestIds, tableIds };
  const table = ctx.tables.find((t) => t.id === g.seat?.tableId);
  const status = table && isNearExit(table, ctx.event.plan) ? 'met' : 'conflict';
  return { rule, status, guestIds, tableIds };
}

function checkCapacity(ctx: Ctx, table: Table): RuleCheck {
  const rule: CapacityRule = { id: capacityRuleId(table.id), kind: 'capacity', tableId: table.id };
  const here = ctx.event.guests.filter((g) => g.seat?.tableId === table.id);
  const tableIds = [table.id];
  if (here.length > table.seats) return { rule, status: 'conflict', guestIds: here.map((g) => g.id), tableIds };
  const seen = new Set<number>();
  const over: GuestId[] = [];
  for (const g of here) {
    const index = g.seat?.index ?? -1;
    if (index < 0 || index >= table.seats || seen.has(index)) over.push(g.id);
    seen.add(index);
  }
  return { rule, status: over.length > 0 ? 'conflict' : 'met', guestIds: over, tableIds };
}

export function checkRule(event: SeatingEvent, rule: AnyRule): RuleCheck {
  const ctx: Ctx = { guests: new Map(event.guests.map((g) => [g.id, g])), tables: event.tables, event };
  return check(ctx, rule);
}

function check(ctx: Ctx, rule: AnyRule): RuleCheck {
  switch (rule.kind) {
    case 'apart':
      return checkApart(ctx, rule);
    case 'together':
      return checkTogether(ctx, rule);
    case 'near-exit':
      return checkNearExit(ctx, rule);
    case 'capacity': {
      const table = ctx.tables.find((t) => t.id === rule.tableId);
      return table ? checkCapacity(ctx, table) : { rule, status: 'met', guestIds: [], tableIds: [] };
    }
  }
}

function push<K>(map: Map<K, RuleId[]>, key: K, id: RuleId): void {
  const list = map.get(key);
  if (list) {
    if (!list.includes(id)) list.push(id);
  } else {
    map.set(key, [id]);
  }
}

/** Judge every explicit rule plus one implicit capacity rule per table. */
export function evaluate(event: SeatingEvent): RuleReport {
  const ctx: Ctx = { guests: new Map(event.guests.map((g) => [g.id, g])), tables: event.tables, event };
  const checks = [...event.rules, ...capacityRules(event)].map((r) => check(ctx, r));
  const conflicts = checks.filter((c) => c.status === 'conflict');
  const conflictsByGuest = new Map<GuestId, RuleId[]>();
  const conflictsByTable = new Map<TableId, RuleId[]>();
  for (const c of conflicts) {
    for (const g of c.guestIds) push(conflictsByGuest, g, c.rule.id);
    for (const t of conflictTables(ctx, c)) push(conflictsByTable, t, c.rule.id);
  }
  const counts: Record<RuleStatus, number> = { met: 0, waiting: 0, conflict: 0 };
  for (const c of checks) counts[c.status]++;
  return {
    checks,
    conflicts,
    byRule: new Map(checks.map((c) => [c.rule.id, c])),
    conflictsByGuest,
    conflictsByTable,
    counts,
  };
}

/** For a together conflict every table is involved; otherwise only where the trouble is. */
function conflictTables(ctx: Ctx, c: RuleCheck): readonly TableId[] {
  if (c.rule.kind !== 'apart') return c.tableIds;
  const shared = c.guestIds.map((id) => ctx.guests.get(id)?.seat?.tableId);
  return shared[0] !== undefined && shared[0] === shared[1] ? [shared[0]] : [];
}

/** Structured text parts for showing a rule; the app turns these into a sentence. */
export interface RuleDescription {
  readonly kind: RuleKind;
  readonly names: readonly string[];
  readonly partyLabel?: string;
  /** Where the guests sit, when that is a single table (capacity: the table itself). */
  readonly tableLabel?: string;
  /** Capacity only. */
  readonly seats?: number;
  readonly assigned?: number;
}

export function describeRule(rule: AnyRule, event: SeatingEvent): RuleDescription {
  const name = (id: GuestId): string => event.guests.find((g) => g.id === id)?.name ?? '';
  const labelOf = (ids: readonly GuestId[]): string | undefined => {
    const tables = new Set(ids.map((id) => event.guests.find((g) => g.id === id)?.seat?.tableId));
    const [only] = [...tables];
    if (tables.size !== 1 || only === undefined) return undefined;
    return event.tables.find((t) => t.id === only)?.label;
  };
  const withTable = (d: RuleDescription, ids: readonly GuestId[]): RuleDescription => {
    const tableLabel = labelOf(ids);
    return tableLabel === undefined ? d : { ...d, tableLabel };
  };
  switch (rule.kind) {
    case 'apart':
      return withTable({ kind: 'apart', names: rule.guests.map(name) }, rule.guests);
    case 'together': {
      const members = event.guests.filter((g) => g.partyId === rule.partyId);
      const partyLabel = event.parties.find((p) => p.id === rule.partyId)?.label ?? '';
      const ids = members.map((g) => g.id);
      return withTable({ kind: 'together', names: members.map((g) => g.name), partyLabel }, ids);
    }
    case 'near-exit':
      return withTable({ kind: 'near-exit', names: [name(rule.guestId)] }, [rule.guestId]);
    case 'capacity': {
      const table = event.tables.find((t) => t.id === rule.tableId);
      const here = event.guests.filter((g) => g.seat?.tableId === rule.tableId);
      return {
        kind: 'capacity',
        names: here.map((g) => g.name),
        tableLabel: table?.label ?? '',
        seats: table?.seats ?? 0,
        assigned: here.length,
      };
    }
  }
}
