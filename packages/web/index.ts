import { EventAdapter, EventShape, EventStoreParser } from "@cristaline/core";

export interface StorageEventAdapterOptions<Event extends EventShape> {
  storage: Storage,
  key: string,
  parser: EventStoreParser<Event>
}

export class StorageEventAdapter<Event extends EventShape> implements EventAdapter<Event> {
  private constructor(private readonly storage: Storage, private readonly eventsKey: string, private readonly parse: EventStoreParser<Event>) { }


  public static for<Event extends EventShape>({ storage, key: eventsKey, parser }: StorageEventAdapterOptions<Event>): StorageEventAdapter<Event> {
    return new StorageEventAdapter(storage, eventsKey, parser);
  }

  public async save(event: Event): Promise<void> {
    const events = this.storage.getItem(this.eventsKey) ?? "[";

    this.storage.setItem(this.eventsKey, events + JSON.stringify(event) + ",");
  }

  public async retrieve(): Promise<Event[]> {
    const serializedEvents = ((this.storage.getItem(this.eventsKey) ?? "[") + "]").replace(/,(?=\s*])/, "");
    const deserializedEvents: unknown[] = JSON.parse(serializedEvents);
    const events: Event[] = [];

    if (!Array.isArray(deserializedEvents)) {
      throw new Error("Events not stored as array");
    }

    for (const deserializedEvent of deserializedEvents) {
      const event = this.parse(deserializedEvent)

      if (event instanceof Error) {
        throw event;
      }

      events.push(event);
    }

    return events;
  }
}