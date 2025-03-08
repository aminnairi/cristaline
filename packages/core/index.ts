export interface EventShape {
  readonly type: string,
  readonly version: number,
  readonly identifier: string,
  readonly date: Date,
  readonly data: Record<string, unknown>
}

export class CorruptionError extends Error {
  public override readonly name = "CorruptionError";

  public constructor(public readonly errors: Error[]) {
    super();
  }
}

export class TransactionError extends Error {
  public override readonly name = "TransactionError";

  public constructor(public readonly error: Error) {
    super();
  }
}

export type Replay<State, Event> = (previousState: State, event: Event) => State

export type Subscriber = () => void;

export type UnsubscribeFunction = () => void

export type SubscribeFunction = (subscriber: Subscriber) => UnsubscribeFunction

export type TransactionCommitFunction = () => Promise<void>;

export type TransactionRollbackFunction = () => void;

export interface TransactionCallbackOptions {
  readonly commit: TransactionCommitFunction
  readonly rollback: TransactionRollbackFunction
}

export type TransactionCallbackFunction = (options: TransactionCallbackOptions) => Promise<void>

export type TransactionFunction = (callback: TransactionCallbackFunction) => Promise<TransactionError | null>

export interface EventStore<State, Event> {
  readonly saveEvent: (event: Event) => Promise<null | Error>;
  readonly getEvents: () => Promise<ReadonlyArray<Event> | CorruptionError>;
  readonly getState: () => Promise<Readonly<State>>;
  readonly subscribe: SubscribeFunction;
  readonly initialize: InitializeFunction;
  readonly transaction: TransactionFunction
}

export type ReleaseLockFunction = () => void;

export interface Event<GenericEvent> {
  readonly save: (event: GenericEvent) => Promise<void>
  readonly retrieve: () => Promise<GenericEvent[]>
}

export type EventStoreParser<GenericEvent> = (event: unknown) => GenericEvent | Error

// PROJECTION ADAPTER

export interface State<GenericState> {
  readonly save: (state: GenericState) => Promise<void>
  readonly retrieve: () => Promise<GenericState>
}

export type InitializeFunction = () => Promise<null | CorruptionError>

export interface CreateEventStoreOptions<GenericState, GenericEvent> {
  readonly event: Event<GenericEvent>,
  readonly state: State<GenericState>,
  readonly replay: Replay<GenericState, GenericEvent>,
}

export function createEventStore<GenericState, GenericEvent extends EventShape>(options: CreateEventStoreOptions<GenericState, GenericEvent>): EventStore<GenericState, GenericEvent> {
  const subscribers: Subscriber[] = [];
  const uncommitedEvents: GenericEvent[] = [];

  let inTransaction: boolean = false;
  let lock: Promise<void> | null = null;

  async function requestLock() {
    let releaseLock: ReleaseLockFunction = () => { };

    if (lock instanceof Promise) {
      await lock;
    }

    lock = new Promise<void>(resolve => {
      releaseLock = resolve
    });

    return releaseLock;
  }

  async function saveEvent(event: GenericEvent): Promise<null | Error> {
    if (inTransaction) {
      uncommitedEvents.push(event);
      return null;
    }

    const releaseLock = await requestLock();

    try {
      await options.stateAdapter.save(options.replay(state, event));
      await options.event.save(event);
      await options.state.save(options.replay(state, event));

      subscribers.forEach(notify => {
        notify();
      });

      return null;
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    } finally {
      releaseLock();
    }
  }

  async function initialize(): Promise<null | CorruptionError> {
    const releaseLock = await requestLock();

    try {
      const events = await options.event.retrieve();

      for (const event of events) {
        options.stateAdapter.save(options.replay(state, event));
      }

      return null;

    } catch (error) {
      return error instanceof Error ? new CorruptionError([error]) : new CorruptionError([new Error(String(error))]);
    } finally {
      releaseLock();
    }
  }

  function getState(): Promise<Readonly<GenericState>> {
    return options.state.retrieve();
  }

  async function getEvents(): Promise<ReadonlyArray<GenericEvent> | CorruptionError> {
    const events = await options.event.retrieve();
    return events;
  }

  function subscribe(newSubscriber: Subscriber): UnsubscribeFunction {
    subscribers.push(newSubscriber);

    return () => {
      const subscriberIndex = subscribers.findIndex(subscriber => {
        return subscriber === newSubscriber;
      });

      if (subscriberIndex !== -1) {
        subscribers.splice(subscriberIndex, 1);
      }
    }
  }

  async function transaction(callback: TransactionCallbackFunction): Promise<TransactionError | null> {
    inTransaction = true;

    function rollback(): void {
      uncommitedEvents.length = 0;
    }

    async function commit(): Promise<void> {
      while (uncommitedEvents.length > 0) {
        console.log("DEBUG: commiting event...");

        const uncommitedEvent = uncommitedEvents[0];

        await options.event.save(uncommitedEvent);

        const state = await options.state.retrieve();

        await options.state.save(options.replay(state, uncommitedEvent));

        uncommitedEvents.splice(0, 1);
      }

      subscribers.forEach(notify => {
        notify();
      });
    }

    const releaseLock = await requestLock();

    try {
      await callback({
        commit,
        rollback
      });

      return null;
    } catch (error) {
      rollback();
      return new TransactionError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      inTransaction = false;
      releaseLock();
    }
  }

  return {
    saveEvent,
    getState,
    getEvents,
    subscribe,
    initialize,
    transaction
  }
}

export interface MemoryStateOptions<GenericState> {
  readonly state: GenericState
}

export class MemoryState<GenericState> implements State<GenericState> {
  private constructor(private state: GenericState, public readonly initial: GenericState) { }

  public static for<GenericState>(options: MemoryStateOptions<GenericState>): MemoryState<GenericState> {
    return new MemoryState(options.state, options.state);
  }

  public async save(state: GenericState): Promise<void> {
    this.state = state;
  }

  public async retrieve(): Promise<GenericState> {
    return this.state;
  }
}

export interface MemoryEventAdapterOptions<Event> {
  readonly events: unknown[]
  readonly parser: (events: unknown[]) => Event[]
}

export class MemoryEvent<GenericEvent> implements Event<GenericEvent> {
  private constructor(private readonly events: unknown[], private readonly parse: (events: unknown[]) => GenericEvent[]) { }

    return new MemoryEventAdapter(options.events, options.parser);
  public static for<GenericEvent extends EventShape>(options: MemoryEventAdapterOptions<GenericEvent>): MemoryEvent<GenericEvent> {
  }

  public async save(event: GenericEvent): Promise<void> {
    this.events.push(event);
  }

  public async retrieve(): Promise<GenericEvent[]> {
    return this.parse(this.events);
  }
}