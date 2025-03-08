import { EventAdapter, EventShape } from "@cristaline/core";
import { appendFile, readFile, stat, writeFile } from "node:fs/promises";

export interface JsonStreamAdapterOptions<Event extends EventShape> {
  readonly path: string,
  readonly parser: (events: unknown) => Event
}

export function createLock() {
  let lock: Promise<void> | null = null;

  async function acquireLock() {
    if (lock instanceof Promise) {
      console.log("Waiting for lock to be released...");
      await lock;
      console.log("Lock released");
    }

    let release: () => void = () => { };

    function releaseLock() {
      release();
      lock = null;
    }

    lock = new Promise(resolve => {
      release = resolve;
    });

    return releaseLock;
  }

  return acquireLock;
}

export class JsonStreamEventAdapter<Event> implements EventAdapter<Event> {
  private constructor(private readonly path: string, private readonly parse: (events: unknown) => Event) { }

  public static for<Event extends EventShape>(options: JsonStreamAdapterOptions<Event>) {
    return new JsonStreamEventAdapter<Event>(options.path, options.parser);
  }

  public async save(event: Event): Promise<void> {
    const pathStat = await stat(this.path).catch(() => ({ isFile: () => false }));

    if (!pathStat.isFile()) {
      await writeFile(this.path, "[\n");
    }

    await appendFile(this.path, JSON.stringify(event) + ",\n");
  }

  public async retrieve(): Promise<Event[]> {
    const pathStat = await stat(this.path).catch(() => ({ isFile: () => false }));

    if (!pathStat.isFile()) {
      await writeFile(this.path, "[\n");
    }

    const buffer = await readFile(this.path);

    const text = (buffer.toString() + "]").replace(/,(?=\s*])/m, "");

    const deserializedEvents: unknown[] = JSON.parse(text);

    if (!Array.isArray(deserializedEvents)) {
      throw new Error("Corupted database");
    }

    const events: Event[] = [];

    for (const deserializedEvent of deserializedEvents) {
      const event = this.parse(deserializedEvent);
      events.push(event);
    }

    return events;
  }
}