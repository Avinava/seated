import { describe, expect, it } from 'vitest';
import {
  createFromTemplate,
  createRng,
  createSampleEvents,
  createSampleWedding,
  evaluate,
  isNearExit,
  layoutFor,
  mulberry32,
  tableBounds,
  validateEvent,
  type EventKind,
  type SeatingEvent,
} from '../src';

const NOW = new Date('2026-10-29T09:00:00.000Z');
const SEEDS = [1, 2, 3, 7, 42, 2026];

function count(e: SeatingEvent, pred: (g: SeatingEvent['guests'][number]) => boolean): number {
  return e.guests.filter(pred).length;
}

function byName(e: SeatingEvent, name: string) {
  const g = e.guests.find((x) => x.name === name);
  if (!g) throw new Error(`no guest ${name}`);
  return g;
}

describe('mulberry32', () => {
  it('is deterministic and in [0, 1)', () => {
    const a = mulberry32(1);
    const b = mulberry32(1);
    const xs = Array.from({ length: 100 }, () => a());
    expect(xs).toEqual(Array.from({ length: 100 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(mulberry32(2)()).not.toBe(xs[0]);
  });

  it('shuffles, picks and weighs deterministically', () => {
    const rng = createRng(5);
    expect(rng.shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(() => rng.pick([])).toThrow(RangeError);
    expect(rng.weighted({ only: 1 })).toBe('only');
    expect(rng.weighted({ never: 0, always: 1 })).toBe('always');
  });
});

describe.each(SEEDS)('sample wedding, seed %i', (seed) => {
  const e = createSampleWedding(NOW, seed);
  const report = evaluate(e);

  it('is a valid event', () => {
    expect(validateEvent(e)).toEqual([]);
  });

  it('has the planned head counts', () => {
    expect(e.guests).toHaveLength(120);
    expect(e.parties).toHaveLength(45);
    expect([
      count(e, (g) => g.rsvp === 'accepted'),
      count(e, (g) => g.rsvp === 'pending'),
      count(e, (g) => g.rsvp === 'declined'),
    ]).toEqual([100, 12, 8]);
    expect(count(e, (g) => g.seat !== null)).toBe(84);
    expect(count(e, (g) => g.seat === null && g.rsvp === 'accepted')).toBe(16);
    expect(e.tables.reduce((s, t) => s + t.seats, 0)).toBe(112);
  });

  it('has unique names and ids, and only accepted guests are seated', () => {
    expect(new Set(e.guests.map((g) => g.name)).size).toBe(120);
    expect(new Set(e.guests.map((g) => g.id)).size).toBe(120);
    expect(e.guests.filter((g) => g.seat).every((g) => g.rsvp === 'accepted')).toBe(true);
  });

  it('opens with exactly one live conflict: Dev and Rohan', () => {
    const dev = byName(e, 'Dev Malhotra');
    const rohan = byName(e, 'Rohan Kapoor');
    expect(report.conflicts.map((c) => c.rule)).toEqual([{ id: 'r-1', kind: 'apart', guests: [dev.id, rohan.id] }]);
    expect(dev.seat?.tableId).toBe(rohan.seat?.tableId);
  });

  it('keeps every seated party at one table', () => {
    for (const p of e.parties) {
      const tables = new Set(e.guests.filter((g) => g.partyId === p.id && g.seat).map((g) => g.seat?.tableId));
      expect(tables.size, p.label).toBeLessThanOrEqual(1);
    }
  });

  it('seats Kamla Mehta by the exit with her rules', () => {
    const kamla = byName(e, 'Kamla Mehta');
    const mehtas = e.parties.find((p) => p.label === 'The Mehtas');
    expect(kamla.access).toBe(true);
    expect(kamla.partyId).toBe(mehtas?.id);
    expect(e.rules).toContainEqual({ id: 'r-2', kind: 'together', partyId: mehtas?.id });
    expect(e.rules).toContainEqual({ id: 'r-3', kind: 'near-exit', guestId: kamla.id });
    expect(kamla.seat?.tableId).toBe('t-1');
    expect(report.byRule.get('r-3')?.status).toBe('met');
  });

  it('has plus-ones, tags and every meal', () => {
    expect(count(e, (g) => g.plusOneOf !== null)).toBeGreaterThan(5);
    for (const tag of ['kids', 'vip'])
      expect(
        count(e, (g) => g.tags.includes(tag)),
        tag,
      ).toBeGreaterThan(0);
    expect(new Set(e.guests.map((g) => g.meal)).size).toBeGreaterThanOrEqual(4);
    expect(e.guests.filter((g) => g.meal === 'other').every((g) => g.dietary !== '')).toBe(true);
  });
});

describe('sample wedding layout', () => {
  const e = createSampleWedding(NOW);

  it('is the right event', () => {
    expect(e).toMatchObject({
      id: 'ev-wedding',
      name: "Ananya & Kabir's wedding",
      kind: 'wedding',
      date: '2026-12-18',
      venue: 'Juniper Hall',
      city: 'Bengaluru',
      createdAt: NOW.toISOString(),
    });
    expect(e.groups.map((g) => [g.label, g.tone])).toEqual([
      ["Bride's family", 1],
      ["Groom's family", 2],
      ['Friends', 3],
      ['Work', 4],
    ]);
  });

  it('puts T1 and T5 (and only those) near the exit', () => {
    const near = e.tables.filter((t) => isNearExit(t, e.plan)).map((t) => t.label);
    expect(near).toEqual(['T1', 'T5']);
  });

  it('keeps tables inside the plan and apart from each other', () => {
    const boxes = e.tables.map(tableBounds);
    for (const b of boxes) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(e.plan.width);
      expect(b.y + b.h).toBeLessThanOrEqual(e.plan.height);
    }
    boxes.forEach((a, i) =>
      boxes.slice(i + 1).forEach((b) => {
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap).toBe(false);
      }),
    );
  });

  it('is deterministic, with `now` only touching the timestamps', () => {
    const later = createSampleWedding(new Date('2027-01-01T00:00:00.000Z'));
    expect({ ...later, createdAt: '', updatedAt: '' }).toEqual({ ...e, createdAt: '', updatedAt: '' });
    expect(createSampleWedding(NOW, 2).guests.map((g) => g.name)).not.toEqual(e.guests.map((g) => g.name));
  });
});

describe('createSampleEvents', () => {
  const events = createSampleEvents(NOW);

  it('returns the wedding and two smaller events', () => {
    expect(events.map((e) => [e.id, e.name, e.kind])).toEqual([
      ['ev-wedding', "Ananya & Kabir's wedding", 'wedding'],
      ['ev-birthday', "Meera's 30th", 'birthday'],
      ['ev-office', 'Kestrel annual dinner', 'office'],
    ]);
    expect(events[1]?.guests).toHaveLength(24);
    expect(events[2]?.guests).toHaveLength(60);
  });

  it.each([1, 2])('event %i is valid, conflict free and partly seated', (i) => {
    const e = events[i] as SeatingEvent;
    expect(validateEvent(e)).toEqual([]);
    expect(evaluate(e).conflicts).toEqual([]);
    const accepted = e.guests.filter((g) => g.rsvp === 'accepted');
    const seatedCount = accepted.filter((g) => g.seat).length;
    expect(seatedCount).toBeGreaterThan(accepted.length / 2);
    expect(seatedCount).toBeLessThan(accepted.length);
    expect(e.guests.some((g) => g.rsvp === 'declined')).toBe(true);
  });
});

describe('createFromTemplate', () => {
  it.each<[EventKind, number, number]>([
    ['wedding', 11, 4],
    ['birthday', 4, 4],
    ['office', 8, 4],
    ['conference', 10, 4],
    ['other', 6, 1],
  ])('%s has %i tables and %i groups', (kind, tables, groups) => {
    const e = createFromTemplate(kind, ' My event ', '2027-02-14', NOW);
    expect(e.tables).toHaveLength(tables);
    expect(e.groups).toHaveLength(groups);
    expect(e.guests).toEqual([]);
    expect(e.name).toBe('My event');
    expect(e.id).toBe(`ev-my-event-${NOW.getTime().toString(36)}`);
    expect(validateEvent(e)).toEqual([]);
    expect(e.tables.some((t) => isNearExit(t, e.plan))).toBe(true);
    expect(new Set(e.tables.map((t) => t.label)).size).toBe(tables);
  });

  it('takes an explicit id and falls back for names with no letters', () => {
    expect(createFromTemplate('other', 'x', '2027-01-01', NOW, 'ev-1').id).toBe('ev-1');
    expect(createFromTemplate('other', '!!!', '2027-01-01', NOW).id).toMatch(/^ev-event-/);
  });

  it('gives every layout room inside the plan', () => {
    for (const kind of ['wedding', 'birthday', 'office', 'conference', 'other'] as const) {
      for (const b of layoutFor(kind).tables.map(tableBounds)) {
        expect(b.x >= 0 && b.y >= 0 && b.x + b.w <= 1180 && b.y + b.h <= 700, kind).toBe(true);
      }
    }
  });
});
