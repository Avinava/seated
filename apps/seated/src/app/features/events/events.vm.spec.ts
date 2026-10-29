import { createFromTemplate, createSampleWedding } from '@seated/domain';
import { countdown, eventCard, formatEventDate, importFileError, isoToday, TEMPLATES } from './events.vm';

describe('events view model', () => {
  const now = new Date(2026, 9, 29, 10, 0);

  describe('countdown', () => {
    it.each([
      [50, 'in 50 days'],
      [2, 'in 2 days'],
      [1, 'Tomorrow'],
      [0, 'Today'],
      [-1, 'Yesterday'],
      [-3, '3 days ago'],
      [1200, 'in 1,200 days'],
    ])('%i days reads "%s"', (days, text) => {
      expect(countdown(days)).toBe(text);
    });
  });

  describe('formatEventDate', () => {
    it.each([
      ['2026-12-18', 'Fri 18 Dec 2026'],
      ['2027-01-01', 'Fri 1 Jan 2027'],
    ])('%s reads "%s"', (iso, text) => {
      expect(formatEventDate(iso)).toBe(text);
    });
  });

  describe('eventCard', () => {
    const wedding = createSampleWedding(now);
    const card = eventCard(wedding, now);

    it.each([
      ['name', "Ananya & Kabir's wedding"],
      ['kindLabel', 'Wedding'],
      ['when', 'Fri 18 Dec 2026'],
      ['place', 'Juniper Hall · Bengaluru'],
      ['countdown', 'in 50 days'],
      ['repliedText', '108/120'],
      ['seatedText', '84 of 100'],
      ['link', '/events/ev-wedding/seating'],
    ] as const)('%s is %s', (key, value) => {
      expect(card[key]).toBe(value);
    });

    it('counts replies as accepted plus declined, and seats against coming', () => {
      expect([card.invited, card.replied, card.coming, card.seated]).toEqual([120, 108, 100, 84]);
      expect(card.past).toBe(false);
    });

    it('leaves the place blank for a new event without a venue', () => {
      const blank = eventCard(createFromTemplate('birthday', 'Party', '2026-10-26', now, 'e-1'), now);
      expect(blank.place).toBe('');
      expect(blank.countdown).toBe('3 days ago');
      expect(blank.past).toBe(true);
      expect(blank.seatedText).toBe('0 of 0');
    });
  });

  describe('importFileError', () => {
    it.each([
      [[{ code: 'invalid-json', path: '' }], 'not readable JSON'],
      [[{ code: 'wrong-format', path: 'format' }], 'not a Seated export'],
      [[{ code: 'unsupported-version', path: 'version' }], 'newer version'],
      [
        [
          { code: 'invalid-value', path: 'event.guests.3.rsvp' },
          { code: 'duplicate-id', path: 'event.guests.4.id' },
        ],
        '2 problems, first at event.guests.3.rsvp',
      ],
    ] as const)('%j mentions "%s"', (errors, text) => {
      expect(importFileError(errors)).toContain(text);
    });
  });

  it('offers the four templates', () => {
    expect(TEMPLATES.map((t) => t.kind)).toEqual(['wedding', 'birthday', 'office', 'conference']);
  });

  it.each([
    [new Date(2026, 9, 29, 23, 59), '2026-10-29'],
    [new Date(2027, 0, 5, 0, 1), '2027-01-05'],
  ])('isoToday(%s) is %s', (date, iso) => {
    expect(isoToday(date)).toBe(iso);
  });
});
