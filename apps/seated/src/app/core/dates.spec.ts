import { daysUntil, localDate } from './dates';

describe('daysUntil', () => {
  const now = new Date(2026, 9, 29, 23, 30);

  it.each([
    ['2026-10-29', 0],
    ['2026-10-30', 1],
    ['2026-12-18', 50],
    ['2026-10-01', -28],
    ['2027-03-29', 151],
  ])('%s is %i days away', (date, days) => {
    expect(daysUntil(date, now)).toBe(days);
  });
});

describe('localDate', () => {
  it('keeps the calendar day', () => {
    const d = localDate('2026-12-18');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 11, 18]);
  });
});
