import type { FloorPlan, Guest, SeatingEvent, Table } from '../../src';

export function guest(id: string, over: Partial<Guest> = {}): Guest {
  return {
    id,
    name: `Guest ${id}`,
    email: `${id}@example.com`,
    partyId: null,
    groupId: 'g1',
    rsvp: 'accepted',
    meal: 'veg',
    dietary: '',
    tags: [],
    access: false,
    plusOneOf: null,
    notes: '',
    seat: null,
    ...over,
  };
}

export function table(id: string, over: Partial<Table> = {}): Table {
  return { id, label: id.toUpperCase(), shape: 'round', seats: 10, x: 400, y: 300, rotation: 0, ...over };
}

export const plan: FloorPlan = {
  width: 1180,
  height: 700,
  zones: [{ kind: 'exit', label: 'Exit', x: 1140, y: 300, w: 40, h: 100 }],
};

export function event(over: Partial<SeatingEvent> = {}): SeatingEvent {
  return {
    id: 'e1',
    name: 'Test event',
    kind: 'wedding',
    date: '2026-12-18',
    venue: 'Hall',
    city: 'Pune',
    groups: [{ id: 'g1', label: 'Family', tone: 1 }],
    parties: [],
    guests: [],
    tables: [],
    rules: [],
    plan,
    createdAt: '2026-10-29T00:00:00.000Z',
    updatedAt: '2026-10-29T00:00:00.000Z',
    ...over,
  };
}
