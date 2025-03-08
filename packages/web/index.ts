import { Event, EventShape, EventStoreParser } from "@cristaline/core";

export interface StorageEventAdapterOptions<Event extends EventShape> {
  storage: Storage,
  key: string,
  parser: EventStoreParser<Event>
}

export class StorageEvent<GenericEvent extends EventShape> implements Event<GenericEvent> {
  private constructor(private readonly storage: Storage, private readonly eventsKey: string, private readonly parse: EventStoreParser<GenericEvent>) { }

  public static for<GenericEvent extends EventShape>({ storage, key: eventsKey, parser }: StorageEventAdapterOptions<GenericEvent>): StorageEvent<GenericEvent> {
    return new StorageEvent(storage, eventsKey, parser);
  }

  public async save(event: GenericEvent): Promise<void> {
    const events = this.storage.getItem(this.eventsKey) ?? "[";

    this.storage.setItem(this.eventsKey, events + JSON.stringify(event) + ",");
  }

  public async retrieve(): Promise<GenericEvent[]> {
    const serializedEvents = ((this.storage.getItem(this.eventsKey) ?? "[") + "]").replace(/,(?=\s*])/, "");
    const deserializedEvents: unknown[] = JSON.parse(serializedEvents);
    const events: GenericEvent[] = [];

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