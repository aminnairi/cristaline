import { EventAdapter } from "@cristaline/core";

export interface WebStorageAdapterOptions {
  storage: Storage,
  key: string
}

export class WebStorageAdapter<Event> implements EventAdapter<Event> {
  private lock: Promise<void> | null = null;

  private constructor(private readonly storage: Storage, private readonly eventsKey: string) { }

  public async requestLock(): Promise<ReleaseLockFunction> {
    let releaseLock: ReleaseLockFunction = () => { };

    if (this.lock instanceof Promise) {
      await this.lock;
    }

    this.lock = new Promise(resolve => {
      releaseLock = resolve
    });

    return releaseLock;
  }

  public static for<Event>({ storage, key: eventsKey }: WebStorageAdapterOptions): WebStorageAdapter<Event> {
    return new WebStorageAdapter(storage, eventsKey);
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