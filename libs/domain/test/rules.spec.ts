import { describe, expect, it } from 'vitest';
import { capacityRuleId, checkRule, describeRule, evaluate, type Guest, type Rule, type RuleStatus } from '../src';
import { event, guest, party, seated, table } from './support/builders';

// t1 sits by the builder plan's exit; t2 does not.
const tables = [table('t1', { x: 1020, y: 350, seats: 4 }), table('t2', { x: 700, y: 350, seats: 2 })];
const parties = [party('p1', 'The Raos')];

function statusOf(rule: Rule, guests: Guest[]): RuleStatus {
  return checkRule(event({ tables, parties, guests, rules: [rule] }), rule).status;
}

describe('rule statuses', () => {
  const apart: Rule = { id: 'r1', kind: 'apart', guests: ['a', 'b'] };
  const together: Rule = { id: 'r2', kind: 'together', partyId: 'p1' };
  const exit: Rule = { id: 'r3', kind: 'near-exit', guestId: 'a' };

  it.each<[string, Rule, Guest[], RuleStatus]>([
    ['apart, different tables', apart, [seated('a', 't1', 0), seated('b', 't2', 0)], 'met'],
    ['apart, same table', apart, [seated('a', 't1', 0), seated('b', 't1', 1)], 'conflict'],
    ['apart, one unseated', apart, [seated('a', 't1', 0), guest('b')], 'waiting'],
    ['apart, one declined', apart, [seated('a', 't1', 0), guest('b', { rsvp: 'declined' })], 'met'],
    ['apart, one deleted', apart, [seated('a', 't1', 0)], 'met'],
    [
      'together, one table',
      together,
      [seated('a', 't1', 0, { partyId: 'p1' }), seated('b', 't1', 1, { partyId: 'p1' })],
      'met',
    ],
    [
      'together, split',
      together,
      [seated('a', 't1', 0, { partyId: 'p1' }), seated('b', 't2', 1, { partyId: 'p1' })],
      'conflict',
    ],
    [
      'together, split with someone unseated',
      together,
      [seated('a', 't1', 0, { partyId: 'p1' }), seated('b', 't2', 1, { partyId: 'p1' }), guest('c', { partyId: 'p1' })],
      'conflict',
    ],
    [
      'together, one unseated',
      together,
      [seated('a', 't1', 0, { partyId: 'p1' }), guest('b', { partyId: 'p1' })],
      'waiting',
    ],
    [
      'together, ignoring a declined member elsewhere',
      together,
      [seated('a', 't1', 0, { partyId: 'p1' }), guest('b', { partyId: 'p1', rsvp: 'declined' })],
      'met',
    ],
    ['near-exit, by the exit', exit, [seated('a', 't1', 0)], 'met'],
    ['near-exit, far away', exit, [seated('a', 't2', 0)], 'conflict'],
    ['near-exit, unseated', exit, [guest('a')], 'waiting'],
    ['near-exit, declined', exit, [guest('a', { rsvp: 'declined' })], 'met'],
    ['near-exit, at a missing table', exit, [seated('a', 'gone', 0)], 'conflict'],
  ])('%s is %s', (_, rule, guests, expected) => {
    expect(statusOf(rule, guests)).toBe(expected);
  });

  it.each<[string, Guest[], RuleStatus, string[]]>([
    ['within seats', [seated('a', 't2', 0), seated('b', 't2', 1)], 'met', []],
    ['seat index past the end', [seated('a', 't2', 0), seated('b', 't2', 2)], 'conflict', ['b']],
    ['two on one seat', [seated('a', 't2', 1), seated('b', 't2', 1)], 'conflict', ['b']],
    [
      'more guests than seats',
      [seated('a', 't2', 0), seated('b', 't2', 1), seated('c', 't2', 1)],
      'conflict',
      ['a', 'b', 'c'],
    ],
  ])('capacity %s', (_, guests, status, ids) => {
    const e = event({ tables, guests });
    const c = checkRule(e, { id: capacityRuleId('t2'), kind: 'capacity', tableId: 't2' });
    expect([c.status, c.guestIds]).toEqual([status, ids]);
  });

  it('treats capacity of a missing table as met', () => {
    expect(checkRule(event(), { id: 'capacity:zz', kind: 'capacity', tableId: 'zz' }).status).toBe('met');
  });
});

describe('evaluate', () => {
  const e = event({
    tables,
    parties,
    guests: [
      seated('a', 't2', 0, { partyId: 'p1' }),
      seated('b', 't1', 0, { partyId: 'p1' }),
      seated('c', 't2', 1),
      seated('d', 't2', 1),
      guest('e'),
    ],
    rules: [
      { id: 'r1', kind: 'apart', guests: ['a', 'c'] },
      { id: 'r2', kind: 'together', partyId: 'p1' },
      { id: 'r3', kind: 'near-exit', guestId: 'a' },
      { id: 'r4', kind: 'apart', guests: ['b', 'e'] },
    ],
  });
  const report = evaluate(e);

  it('checks explicit rules plus one capacity rule per table', () => {
    expect(report.checks.map((c) => [c.rule.id, c.status])).toEqual([
      ['r1', 'conflict'],
      ['r2', 'conflict'],
      ['r3', 'conflict'],
      ['r4', 'waiting'],
      ['capacity:t1', 'met'],
      ['capacity:t2', 'conflict'],
    ]);
    expect(report.counts).toEqual({ met: 1, waiting: 1, conflict: 4 });
    expect(report.byRule.get('r4')?.status).toBe('waiting');
  });

  it('indexes conflicts by guest and table', () => {
    expect(report.conflictsByGuest.get('a')).toEqual(['r1', 'r2', 'r3', 'capacity:t2']);
    expect(report.conflictsByGuest.get('b')).toEqual(['r2']);
    expect(report.conflictsByGuest.get('d')).toEqual(['capacity:t2']);
    expect(report.conflictsByGuest.has('e')).toBe(false);
    expect(report.conflictsByTable.get('t1')).toEqual(['r2']);
    expect(report.conflictsByTable.get('t2')).toEqual(['r1', 'r2', 'r3', 'capacity:t2']);
  });

  it('does not pin an apart conflict on a table it is not at', () => {
    const r = evaluate(
      event({
        tables,
        guests: [seated('a', 't1', 0), seated('b', 't1', 1)],
        rules: [{ id: 'x', kind: 'apart', guests: ['a', 'b'] }],
      }),
    );
    expect(r.conflictsByTable.get('t1')).toEqual(['x']);
    expect(r.conflictsByTable.has('t2')).toBe(false);
  });
});

describe('describeRule', () => {
  const e = event({
    tables,
    parties,
    guests: [
      seated('a', 't1', 0, { name: 'Asha', partyId: 'p1' }),
      seated('b', 't1', 1, { name: 'Bina', partyId: 'p1' }),
      guest('c', { name: 'Chetan' }),
    ],
  });

  it.each<[string, Parameters<typeof describeRule>[0], object]>([
    [
      'apart at one table',
      { id: 'r', kind: 'apart', guests: ['a', 'b'] },
      { kind: 'apart', names: ['Asha', 'Bina'], tableLabel: 'T1' },
    ],
    [
      'apart, one unseated',
      { id: 'r', kind: 'apart', guests: ['a', 'c'] },
      { kind: 'apart', names: ['Asha', 'Chetan'] },
    ],
    [
      'together',
      { id: 'r', kind: 'together', partyId: 'p1' },
      { kind: 'together', names: ['Asha', 'Bina'], partyLabel: 'The Raos', tableLabel: 'T1' },
    ],
    ['near-exit', { id: 'r', kind: 'near-exit', guestId: 'c' }, { kind: 'near-exit', names: ['Chetan'] }],
    [
      'capacity',
      { id: 'r', kind: 'capacity', tableId: 't1' },
      { kind: 'capacity', names: ['Asha', 'Bina'], tableLabel: 'T1', seats: 4, assigned: 2 },
    ],
    [
      'capacity of a missing table',
      { id: 'r', kind: 'capacity', tableId: 'zz' },
      { kind: 'capacity', tableLabel: '', seats: 0 },
    ],
    [
      'rule naming deleted things',
      { id: 'r', kind: 'together', partyId: 'zz' },
      { kind: 'together', names: [], partyLabel: '' },
    ],
  ])('%s', (_, rule, expected) => {
    const d = describeRule(rule, e);
    expect(d).toMatchObject(expected);
    if (!('tableLabel' in expected)) expect(d.tableLabel).toBeUndefined();
  });
});
