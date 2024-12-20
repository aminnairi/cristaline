import { appendFile, readFile, stat, writeFile } from "node:fs/promises";
import { z, ZodSchema } from "zod";

export interface JsonStreamEventAdapterOptions {
  readonly path: {
    readonly events: string,
    readonly archive: string
  },
  readonly eventSchema: ZodSchema,
  readonly stateSchema: ZodSchema
}

export interface EventShape {
  readonly type: string,
  readonly identifier: string,
  readonly date: Date,
  readonly data: Record<string, unknown>
}

export interface SnapshotEvent<State> {
  readonly identifier: string
  readonly type: "SNAPSHOT"
  readonly date: Date,
  readonly data: State
}

export type Reducer<State, Event> = (state: State, event: Event) => State

export interface EventDatabase<State, Event> {
  readonly saveEvent: (event: Event) => Promise<void>;
  readonly getState: () => Promise<State>;
  readonly takeSnapshot: () => Promise<void>
}

export interface EventAdapter<State, Event> {
  readonly save: (event: Event | SnapshotEvent<State>) => Promise<void>
  readonly retrieve: () => Promise<Event[]>
  readonly archive: (event: SnapshotEvent<State>) => Promise<void>
}

export interface CreateEventDatabaseOptions<State, Event> {
  readonly initialState: State,
  readonly eventAdapter: EventAdapter<State, Event>,
  readonly replay: Reducer<State, Event | SnapshotEvent<State>>
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

export async function createEventDatabase<State, Event extends EventShape>(options: CreateEventDatabaseOptions<State, Event>): Promise<EventDatabase<State, Event>> {
  async function saveEvent(event: Event): Promise<void> {
    await options.eventAdapter.save(event);
  }

  async function getState(): Promise<State> {
    const events = await options.eventAdapter.retrieve();

    const state = events.reduce((state, event) => {
      return options.replay(state, event);
    }, options.initialState);

    return state;
  }

  async function takeSnapshot(): Promise<void> {
    const state = await getState();

    const snapshotEvent: SnapshotEvent<State> = {
      type: "SNAPSHOT",
      data: state,
      date: new Date(),
      identifier: crypto.randomUUID()
    }

    await options.eventAdapter.archive(snapshotEvent);
  }

  return {
    saveEvent,
    getState,
    takeSnapshot
  }
}

export class JsonStreamEventAdapter<State, Event> implements EventAdapter<State, Event> {
  private readonly acquireLock = createLock();

  private constructor(private readonly eventsPath: string, private readonly archivePath: string, private readonly eventSchema: ZodSchema, private readonly snapshotSchema: ZodSchema) { }

  private async retrieveEvents(): Promise<Event[]> {
    const buffer = await readFile(this.eventsPath);

    const text = (buffer.toString() + "]").replace(/,(?=\s*])/m, "");

    const json = JSON.parse(text);

    if (!Array.isArray(json)) {
      throw new Error("Corupted database");
    }

    const events = json.map(event => {
      const validation = this.eventSchema.safeParse(event);

      if (validation.success) {
        return validation.data;
      }

      const snapshotValidation = this.snapshotSchema.safeParse(event);

      if (snapshotValidation.success) {
        return snapshotValidation.data;
      }

      throw new Error("Corputed database");
    });

    return events;
  }

  public static async for<State, Event>(options: JsonStreamEventAdapterOptions) {
    const eventsPathStat = await stat(options.path.events).catch(() => ({ isFile: () => false }));

    if (!eventsPathStat.isFile()) {
      await writeFile(options.path.events, "[\n");
    }

    const archivePathStat = await stat(options.path.archive).catch(() => ({ isFile: () => false }));

    if (!archivePathStat.isFile()) {
      await writeFile(options.path.archive, "[\n");
    }

    const snapshotSchema = z.object({
      type: z.literal("SNAPSHOT"),
      identifier: z.string().uuid(),
      date: z.date({ coerce: true }),
      data: options.stateSchema
    })

    return new JsonStreamEventAdapter<State, Event>(options.path.events, options.path.archive, options.eventSchema, snapshotSchema);
  }

  public async save(event: Event | SnapshotEvent<State>): Promise<void> {
    const releaseLock = await this.acquireLock();

    await appendFile(this.eventsPath, JSON.stringify(event) + ",\n");

    releaseLock();
  }

  public async retrieve(): Promise<Event[]> {
    const releaseLock = await this.acquireLock();

    const events = await this.retrieveEvents();

    releaseLock();

    return events;
  }

  public async archive(snapshotEvent: SnapshotEvent<State>): Promise<void> {
    const releaseLock = await this.acquireLock();

    const events = await this.retrieveEvents();

    const serializedEvents = events.map(event => {
      return JSON.stringify(event) + ","
    }).join("\n");

    await appendFile(this.archivePath, serializedEvents);

    await writeFile(this.eventsPath, "[\n" + JSON.stringify(snapshotEvent) + ",");

    releaseLock();
  }
}
