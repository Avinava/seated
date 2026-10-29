import type { Rsvp, Rule, SeatingEvent, TableId } from '../model/types';
import { buildGuests, C, F, familyPeople, M, pairPeople, type PartySpec } from './build';
import { SURNAMES } from './names';
import { createRng, type Rng } from './random';
import { weddingLayout } from './templates';

export const SAMPLE_WEDDING_ID = 'ev-wedding';

const BRIDE = 'grp-1';
const GROOM = 'grp-2';
const FRIENDS = 'grp-3';
const WORK = 'grp-4';

/** Index of each anchor party in the spec list. */
const ANCHOR = { couple: 0, mehtas: 3, dev: 9, rohan: 10, chawlas: 0 } as const;

function family(rng: Rng, groupId: string, size: number, rsvp: Rsvp, table: TableId | null): PartySpec {
  return { kind: 'family', groupId, rsvp, table, people: familyPeople(rng, size) };
}

function pair(rng: Rng, groupId: string, rsvp: Rsvp, table: TableId | null, plusOne = false): PartySpec {
  return { kind: 'pair', groupId, rsvp, table, people: pairPeople(rng), plusOne };
}

function single(rng: Rng, groupId: string, rsvp: Rsvp, table: TableId | null): PartySpec {
  return { kind: 'single', groupId, rsvp, table, people: [rng.pick([F, M])] };
}

/**
 * The plan is fixed so its invariants hold for every seed: 120 guests in 45
 * parties, 100 accepted (84 seated), 12 pending, 8 declined. The seed varies
 * names, meals, tags and who is who inside a household.
 */
function specs(rng: Rng): { seated: PartySpec[]; waiting: PartySpec[] } {
  const a = 'accepted' as const;
  const seated: PartySpec[] = [
    // Head table
    {
      kind: 'pair',
      groupId: BRIDE,
      rsvp: a,
      table: 't-head',
      label: 'Ananya & Kabir',
      tags: ['vip'],
      people: [
        { gender: 'f', first: 'Ananya', surname: 'Iyer', groupId: BRIDE },
        { gender: 'm', first: 'Kabir', surname: 'Bhatia', groupId: GROOM },
      ],
    },
    { kind: 'family', groupId: BRIDE, rsvp: a, table: 't-head', surname: 'Iyer', tags: ['vip'], people: [M, F, M] },
    { kind: 'family', groupId: GROOM, rsvp: a, table: 't-head', surname: 'Bhatia', tags: ['vip'], people: [M, F, F] },
    // T1, by the exit
    {
      kind: 'family',
      groupId: BRIDE,
      rsvp: a,
      table: 't-1',
      surname: 'Mehta',
      people: [{ gender: 'f', first: 'Kamla', access: true, tags: ['vip'] }, M, F, C],
    },
    family(rng, BRIDE, 3, a, 't-1'),
    family(rng, BRIDE, 2, a, 't-1'),
    // T2
    family(rng, BRIDE, 4, a, 't-2'),
    family(rng, BRIDE, 3, a, 't-2'),
    family(rng, BRIDE, 2, a, 't-2'),
    // T3: Dev and Rohan, seated together on purpose so the demo opens with one conflict
    {
      kind: 'single',
      groupId: FRIENDS,
      rsvp: a,
      table: 't-3',
      people: [{ gender: 'm', first: 'Dev', surname: 'Malhotra' }],
    },
    {
      kind: 'single',
      groupId: FRIENDS,
      rsvp: a,
      table: 't-3',
      people: [{ gender: 'm', first: 'Rohan', surname: 'Kapoor' }],
    },
    pair(rng, FRIENDS, a, 't-3', true),
    pair(rng, FRIENDS, a, 't-3', true),
    family(rng, FRIENDS, 3, a, 't-3'),
    // T4
    pair(rng, FRIENDS, a, 't-4', true),
    pair(rng, FRIENDS, a, 't-4'),
    pair(rng, FRIENDS, a, 't-4', true),
    pair(rng, FRIENDS, a, 't-4'),
    // T5, by the exit
    family(rng, GROOM, 4, a, 't-5'),
    family(rng, GROOM, 2, a, 't-5'),
    family(rng, GROOM, 2, a, 't-5'),
    // T6
    family(rng, GROOM, 4, a, 't-6'),
    family(rng, GROOM, 3, a, 't-6'),
    family(rng, GROOM, 2, a, 't-6'),
    // T7
    family(rng, WORK, 3, a, 't-7'),
    pair(rng, WORK, a, 't-7', true),
    pair(rng, WORK, a, 't-7', true),
    pair(rng, WORK, a, 't-7'),
    // T8
    pair(rng, WORK, a, 't-8', true),
    pair(rng, WORK, a, 't-8'),
    pair(rng, WORK, a, 't-8', true),
    // Long A: cousins
    family(rng, BRIDE, 3, a, 't-long-a'),
    family(rng, BRIDE, 3, a, 't-long-a'),
    family(rng, BRIDE, 3, a, 't-long-a'),
  ];
  const waiting: PartySpec[] = [
    // Accepted, not seated yet: work for auto-seat.
    {
      kind: 'family',
      groupId: GROOM,
      rsvp: a,
      table: null,
      surname: 'Chawla',
      people: [{ gender: 'm', access: true, tags: ['vip'] }, F],
    },
    family(rng, WORK, 3, a, null),
    pair(rng, WORK, a, null, true),
    pair(rng, FRIENDS, a, null),
    family(rng, FRIENDS, 4, a, null),
    family(rng, BRIDE, 2, a, null),
    single(rng, GROOM, a, null),
    // Pending
    family(rng, FRIENDS, 3, 'pending', null),
    pair(rng, WORK, 'pending', null, true),
    family(rng, BRIDE, 2, 'pending', null),
    family(rng, GROOM, 4, 'pending', null),
    single(rng, FRIENDS, 'pending', null),
    // Declined
    pair(rng, WORK, 'declined', null),
    pair(rng, FRIENDS, 'declined', null, true),
    family(rng, BRIDE, 3, 'declined', null),
    single(rng, WORK, 'declined', null),
  ];
  return { seated, waiting };
}

/**
 * Ananya and Kabir's wedding: about 120 guests, most seated, one live apart
 * conflict (Dev and Rohan) and a few parties left for auto-seat. Deterministic
 * for a seed; `now` only sets createdAt and updatedAt.
 */
export function createSampleWedding(now: Date, seed = 1): SeatingEvent {
  const rng = createRng(seed);
  const layout = weddingLayout();
  const { seated, waiting } = specs(rng);
  const all = [...seated, ...waiting];
  const reserved = new Set(['Iyer', 'Bhatia', 'Mehta', 'Malhotra', 'Kapoor', 'Chawla']);
  const { guests, parties, members } = buildGuests(
    rng,
    all,
    SURNAMES.filter((s) => !reserved.has(s)),
    layout.groups,
  );

  const id = (spec: number, member = 0): string => members[spec]?.[member] ?? '';
  const mehtas = parties.find((p) => p.label === 'The Mehtas')?.id ?? '';
  const rules: Rule[] = [
    { id: 'r-1', kind: 'apart', guests: [id(ANCHOR.dev), id(ANCHOR.rohan)] },
    { id: 'r-2', kind: 'together', partyId: mehtas },
    { id: 'r-3', kind: 'near-exit', guestId: id(ANCHOR.mehtas) },
    { id: 'r-4', kind: 'near-exit', guestId: id(seated.length + ANCHOR.chawlas) },
  ];
  const stamp = now.toISOString();
  return {
    id: SAMPLE_WEDDING_ID,
    name: "Ananya & Kabir's wedding",
    kind: 'wedding',
    date: '2026-12-18',
    venue: 'Juniper Hall',
    city: 'Bengaluru',
    groups: layout.groups,
    parties,
    guests,
    tables: layout.tables,
    rules,
    plan: layout.plan,
    createdAt: stamp,
    updatedAt: stamp,
  };
}
