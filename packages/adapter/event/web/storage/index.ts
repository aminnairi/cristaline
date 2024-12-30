import { EventAdapter } from "@cristaline/core";

export interface WebStorageEventAdapterOptions {
  storage: Storage,
  key: string
}

export class WebStorageEventAdapter<Event> implements EventAdapter<Event> {
  private lock: Promise<void> | null = null;

  private constructor(private readonly storage: Storage, private readonly eventsKey: string) { }


  public static for<Event>({ storage, key: eventsKey }: WebStorageEventAdapterOptions): WebStorageEventAdapter<Event> {
    return new WebStorageEventAdapter(storage, eventsKey);
  }

  public async save(event: Event): Promise<void> {
    const events = this.storage.getItem(this.eventsKey) ?? "[";

    this.storage.setItem(this.eventsKey, events + JSON.stringify(event) + ",");
  }

  public async retrieve(): Promise<unknown[]> {
    const serializedEvents = ((this.storage.getItem(this.eventsKey) ?? "[") + "]").replace(/,(?=\s*])/, "");
    const deserializedEvents = JSON.parse(serializedEvents);

    if (!Array.isArray(deserializedEvents)) {
      throw new Error("Events not stored as array");
    }

    return deserializedEvents;
  }
}