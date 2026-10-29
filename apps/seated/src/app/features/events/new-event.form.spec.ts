import { FormControl } from '@angular/forms';
import { newEventForm, notInPast } from './new-event.form';

describe('new event form', () => {
  const today = () => '2026-10-29';

  describe('notInPast', () => {
    it.each([
      ['', null],
      ['2026-10-28', { past: true }],
      ['2026-10-29', null],
      ['2026-12-18', null],
      ['2025-12-31', { past: true }],
    ])('%s gives %j', (value, errors) => {
      expect(notInPast(today)(new FormControl(value))).toEqual(errors);
    });
  });

  it.each([
    [{ name: '', date: '2026-12-18' }, false],
    [{ name: '   ', date: '2026-12-18' }, false],
    [{ name: 'Office party', date: '' }, false],
    [{ name: 'Office party', date: '2026-10-01' }, false],
    [{ name: 'Office party', date: '2026-12-18' }, true],
  ])('%j is valid: %s', (value, valid) => {
    const form = newEventForm('office', today);
    form.patchValue(value);
    expect(form.valid).toBe(valid);
    expect(form.getRawValue().kind).toBe('office');
  });
});
