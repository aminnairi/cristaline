import { Adapter, ReleaseLockFunction } from "@cristaline/core";
import { appendFile, readFile, stat, writeFile } from "node:fs/promises";

export interface NodeJsonStreamAdapterOptions {
  readonly path: string,
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

export class NodeJsonStreamAdapter<Event> implements Adapter<Event> {
  private lock: Promise<void> | null = null;

  private constructor(private readonly path: string) { }

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

  public static for<Event>(options: NodeJsonStreamAdapterOptions) {
    return new NodeJsonStreamAdapter<Event>(options.path);
  }

  public async save(event: Event): Promise<void> {
    const pathStat = await stat(this.path).catch(() => ({ isFile: () => false }));

    if (!pathStat.isFile()) {
      await writeFile(this.path, "[\n");
    }

    await appendFile(this.path, JSON.stringify(event) + ",\n");
  }

  public async retrieve(): Promise<unknown[]> {
    const pathStat = await stat(this.path).catch(() => ({ isFile: () => false }));

    if (!pathStat.isFile()) {
      await writeFile(this.path, "[\n");
    }

    const buffer = await readFile(this.path);

    const text = (buffer.toString() + "]").replace(/,(?=\s*])/m, "");

    const deserializedEvents = JSON.parse(text);

    if (!Array.isArray(deserializedEvents)) {
      throw new Error("Corupted database");
    }

    return deserializedEvents;
  }
}