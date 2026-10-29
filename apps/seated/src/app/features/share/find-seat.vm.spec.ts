import type { SharePayload } from '@seated/domain';
import { HIDDEN_MATE, linkProblem, matchCountText, matchGuests, seatResult } from './find-seat.vm';

const payload: SharePayload = {
  v: 1,
  name: 'Test',
  date: '2026-12-18',
  venue: 'Hall',
  city: 'Pune',
  tables: [
    { label: 'T1', shape: 'round' },
    { label: 'Head', shape: 'head' },
  ],
  guests: [
    { name: 'Kamlā Mehta', table: 'T1', seat: 0 },
    { name: 'Rohan Kapoor', table: 'T1', seat: 2 },
    { name: 'Kamal Shah', table: 'Head', seat: 1 },
    { name: 'Anjali Kamath', table: 'T1', seat: 3 },
    { name: "Joel D'Souza", table: 'Head', seat: 0 },
  ],
};

describe('find-seat vm', () => {
  it.each([
    ['', []],
    ['k', []],
    ['kamla', ['Kamlā Mehta']],
    ['KAMLĀ', ['Kamlā Mehta']],
    ['kaml', ['Kamlā Mehta']],
    ['kam', ['Kamal Shah', 'Kamlā Mehta', 'Anjali Kamath']],
    ['mehta kamla', ['Kamlā Mehta']],
    ['  rohan   k ', ['Rohan Kapoor']],
    ['dsouza', ["Joel D'Souza"]],
    ['d souza', ["Joel D'Souza"]],
    ['oel', ["Joel D'Souza"]],
    ['zara', []],
  ])('matches %j', (query, names) => {
    expect(matchGuests(payload, query).map((m) => m.name)).toEqual(names);
  });

  it('caps the list', () => {
    expect(matchGuests(payload, 'a', 5)).toEqual([]);
    expect(matchGuests(payload, 'ka', 2)).toHaveLength(2);
  });

  it('reports one-based seats', () => {
    expect(matchGuests(payload, 'rohan')[0]).toEqual({ key: 'T1#2', name: 'Rohan Kapoor', table: 'T1', seat: 3 });
  });

  it('draws the table with your seat picked and the others named', () => {
    const [kamla] = matchGuests(payload, 'kamla');
    const r = seatResult(payload, kamla!);
    expect(r).toMatchObject({ table: 'T1', seat: 1, shape: 'round', firstName: 'Kamlā', showMates: true });
    expect(r.seats.map((s) => [s.state, s.initials])).toEqual([
      ['picked', 'KM'],
      ['empty', ''],
      ['filled', 'RK'],
      ['filled', 'AK'],
    ]);
    expect(r.seats[0]?.label).toBe('Seat 1, you');
    expect(r.mates).toEqual([
      { name: 'Rohan Kapoor', seat: 3 },
      { name: 'Anjali Kamath', seat: 4 },
    ]);
  });

  it('hides tablemates when the hosts chose to', () => {
    const [kamla] = matchGuests(payload, 'kamla');
    const r = seatResult({ ...payload, tablemates: false }, kamla!);
    expect(r.showMates).toBe(false);
    expect(r.mates).toEqual([]);
    expect(r.seats.map((s) => s.initials)).toEqual(['KM', '', HIDDEN_MATE, HIDDEN_MATE]);
    expect(r.seats.map((s) => s.label).join(' ')).not.toContain('Rohan');
  });

  it.each([
    [undefined, 4],
    [6, 6],
    [2, 4],
  ])('draws a table of size %s with %i seats', (seats, drawn) => {
    const sized = { ...payload, tables: [{ label: 'T1', shape: 'round' as const, seats }] };
    const r = seatResult(sized, matchGuests(sized, 'kamla')[0]!);
    expect(r.seats).toHaveLength(drawn);
    expect(r.seats.slice(4).every((s) => s.state === 'empty')).toBe(true);
  });

  it.each([
    ['missing', 'Open the link from your hosts'],
    ['bad-encoding', 'This link looks cut short'],
    ['unsupported-version', 'This link is from a newer Seated'],
    ['corrupt', "We can't read this link"],
    ['invalid-payload', "We can't read this link"],
  ] as const)('explains a %s link', (problem, heading) => {
    expect(linkProblem(problem).heading).toBe(heading);
  });

  it.each([
    [0, "We can't find that name. Try your first name only, or ask the hosts."],
    [1, '1 match'],
    [4, '4 matches'],
  ])('counts %i matches', (n, text) => {
    expect(matchCountText(n)).toBe(text);
  });
});
