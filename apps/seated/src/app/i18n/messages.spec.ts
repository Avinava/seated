import { count, explain, failure, initials, names, ruleDetail, ruleTitle } from './messages';

describe('messages', () => {
  it('joins names the way people write them', () => {
    expect(names(['Dev'])).toBe('Dev');
    expect(names(['Dev', 'Rohan'])).toBe('Dev and Rohan');
    expect(names(['A', 'B', 'C'])).toBe('A, B and C');
  });

  it('groups numbers the Indian way', () => {
    expect(count(120)).toBe('120');
    expect(count(100000)).toBe('1,00,000');
  });

  it.each([
    [{ kind: 'apart', names: ['Dev Malhotra', 'Rohan Kapoor'] }, 'Keep Dev Malhotra and Rohan Kapoor apart'],
    [{ kind: 'together', names: [], partyLabel: 'The Mehtas' }, 'Keep The Mehtas together'],
    [{ kind: 'near-exit', names: ['Kamla Mehta'] }, 'Seat Kamla Mehta near the exit'],
    [{ kind: 'capacity', names: [], tableLabel: 'T3', seats: 10 }, 'T3 seats 10'],
  ] as const)('titles %o', (d, text) => {
    expect(ruleTitle(d)).toBe(text);
  });

  it('describes the live state of a rule', () => {
    expect(ruleDetail({ kind: 'apart', names: [], tableLabel: 'T2' }, 'conflict')).toBe('Both are at T2');
    expect(ruleDetail({ kind: 'together', names: [] }, 'waiting')).toBe('Waiting for everyone to have a seat');
    expect(ruleDetail({ kind: 'capacity', names: [], seats: 10, assigned: 11 }, 'conflict')).toBe(
      '11 of 10 seats taken',
    );
  });

  it('phrases refusals', () => {
    expect(failure({ ok: false, reason: 'no-room', free: 0 })).toBe('That table is full');
    expect(failure({ ok: false, reason: 'no-room', free: 1 })).toBe('Only 1 seat free there. Try a bigger table.');
  });

  it('flags the auto-seat lines that need a person', () => {
    expect(explain({ code: 'placed-guest', name: 'Asha', tableLabel: 'T1' })).toEqual({
      text: 'Seated Asha at T1',
      needsYou: false,
    });
    const line = explain({ code: 'needs-you', reason: 'no-seat-near-exit', names: ['Kamla Mehta'] });
    expect(line.needsYou).toBe(true);
    expect(line.text).toBe('Needs you: Kamla Mehta, because no free seat near the exit');
  });

  it.each([
    ['Kamla Mehta', 'KM'],
    ['  asha ', 'A'],
    ['Dev Raj Malhotra', 'DM'],
  ])('initials of %j are %s', (name, text) => {
    expect(initials(name)).toBe(text);
  });
});
