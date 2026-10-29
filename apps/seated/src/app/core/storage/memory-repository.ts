import type { EventId, SeatingEvent } from '@seated/domain';
import { EventRepository } from './event-repository';

export class MemoryRepository extends EventRepository {
  private readonly events = new Map<EventId, SeatingEvent>();

  constructor(seed: readonly SeatingEvent[] = []) {
    super();
    for (const e of seed) this.events.set(e.id, e);
  }

  async list(): Promise<SeatingEvent[]> {
    return [...this.events.values()];
  }

  async get(id: EventId): Promise<SeatingEvent | undefined> {
    return this.events.get(id);
  }

  async put(event: SeatingEvent): Promise<void> {
    this.events.set(event.id, event);
  }

  async delete(id: EventId): Promise<void> {
    this.events.delete(id);
  }
}
