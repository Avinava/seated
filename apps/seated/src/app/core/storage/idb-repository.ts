import type { EventId, SeatingEvent } from '@seated/domain';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { EventRepository } from './event-repository';

interface SeatedDb extends DBSchema {
  events: { key: string; value: SeatingEvent };
}

/** Schema version of the IndexedDB database, separate from the export file version. */
const DB_VERSION = 1;

export class IdbRepository extends EventRepository {
  private db: Promise<IDBPDatabase<SeatedDb>> | null = null;

  constructor(private readonly name = 'seated') {
    super();
  }

  private open(): Promise<IDBPDatabase<SeatedDb>> {
    this.db ??= openDB<SeatedDb>(this.name, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) db.createObjectStore('events', { keyPath: 'id' });
      },
    });
    return this.db;
  }

  async list(): Promise<SeatingEvent[]> {
    return (await this.open()).getAll('events');
  }

  async get(id: EventId): Promise<SeatingEvent | undefined> {
    return (await this.open()).get('events', id);
  }

  async put(event: SeatingEvent): Promise<void> {
    await (await this.open()).put('events', event);
  }

  async delete(id: EventId): Promise<void> {
    await (await this.open()).delete('events', id);
  }
}
