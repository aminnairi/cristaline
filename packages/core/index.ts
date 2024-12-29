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

export type Replay<State, Event> = (previousState: State, event: Event) => State

export type Subscriber = () => void;

export type UnsubscribeFunction = () => void

export type SubscribeFunction = (subscriber: Subscriber) => UnsubscribeFunction

export interface EventStore<State, Event> {
  readonly saveEvent: (event: Event) => Promise<null | Error>;
  readonly getEvents: () => ReadonlyArray<Event>;
  readonly getState: () => Readonly<State>;
  readonly subscribe: SubscribeFunction;
  readonly initialize: InitializeFunction;
}

export type ReleaseLockFunction = () => void;

export interface Adapter<Event> {
  readonly save: (event: Event) => Promise<void>
  readonly retrieve: () => Promise<unknown[]>
  readonly requestLock: () => Promise<ReleaseLockFunction>
}

export type EventStoreParser<Event> = (event: unknown) => Event | Error

export type InitializeFunction = () => Promise<null | CorruptionError>

export interface CreateEventStoreOptions<State, Event> {
  readonly state: State,
  readonly parser: EventStoreParser<Event>,
  readonly adapter: Adapter<Event>,
  readonly replay: Replay<State, Event>,
}

export function createEventStore<State, Event extends EventShape>(options: CreateEventStoreOptions<State, Event>): EventStore<State, Event> {
  const subscribers: Subscriber[] = [];

  let state: State = options.state;
  let events: ReadonlyArray<Event> = [];

  async function saveEvent(event: Event): Promise<null | Error> {
    const releaseLock = await options.adapter.requestLock();

    try {

      await options.adapter.save(event);

      state = options.replay(state, event);

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
    const releaseLock = await options.adapter.requestLock();

    try {
      const receivedEvents: unknown[] = await options.adapter.retrieve();
      const parsedEvents: Event[] = [];

      if (receivedEvents instanceof Error) {
        return new CorruptionError([receivedEvents]);
      }

      for (const event of receivedEvents) {
        const parsedEvent = options.parser(event);

        if (parsedEvent instanceof Error) {
          return new CorruptionError([parsedEvent]);
        }

        parsedEvents.push(parsedEvent);
        state = options.replay(state, parsedEvent);
      }

      events = parsedEvents;

      return null;

    } catch (error) {
      return error instanceof Error ? new CorruptionError([error]) : new CorruptionError([new Error(String(error))]);
    } finally {
      releaseLock();
    }
  }

  function getState(): Readonly<State> {
    return state;
  }

  function getEvents(): ReadonlyArray<Event> {
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

  return {
    saveEvent,
    getState,
    getEvents,
    subscribe,
    initialize
  }
}