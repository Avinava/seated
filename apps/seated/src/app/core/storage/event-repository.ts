import type { EventId, SeatingEvent } from '@seated/domain';

/**
 * Where events live. The app talks to this seam only; IndexedDB backs it in the
 * browser and an in-memory map backs it in tests, stories and prerendering.
 */
export abstract class EventRepository {
  abstract list(): Promise<SeatingEvent[]>;
  abstract get(id: EventId): Promise<SeatingEvent | undefined>;
  abstract put(event: SeatingEvent): Promise<void>;
  abstract delete(id: EventId): Promise<void>;
}
