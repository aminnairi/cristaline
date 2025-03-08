import { Event, EventShape } from "@cristaline/core";
import { appendFile, readFile, stat, writeFile } from "node:fs/promises";

export interface JsonStreamEventOptions<Event extends EventShape> {
  readonly path: string,
  readonly parser: (events: unknown) => Event
}

export function createLock() {
  let lock: Promise<void> | null = null;

  async function acquireLock() {
    if (lock instanceof Promise) {
      await lock;
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

export class JsonStreamEvent<GenericEvent> implements Event<GenericEvent> {
  private constructor(private readonly path: string, private readonly parse: (events: unknown) => GenericEvent) { }

  public static for<GenericEvent extends EventShape>(options: JsonStreamEventOptions<GenericEvent>) {
    return new JsonStreamEvent<GenericEvent>(options.path, options.parser);
  }

  public async save(event: GenericEvent): Promise<void> {
    const pathStat = await stat(this.path).catch(() => ({ isFile: () => false }));

    if (!pathStat.isFile()) {
      await writeFile(this.path, "[\n");
    }

    await appendFile(this.path, JSON.stringify(event) + ",\n");
  }

  public async retrieve(): Promise<GenericEvent[]> {
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

    const events: GenericEvent[] = [];

    for (const deserializedEvent of deserializedEvents) {
      const event = this.parse(deserializedEvent);
      events.push(event);
    }

    return events;
  }
}