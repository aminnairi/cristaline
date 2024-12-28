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
  readonly saveEvent: (event: Event) => Promise<void>;
  readonly getEvents: () => Promise<Event[] | CorruptionError>;
  readonly getState: () => Promise<State | CorruptionError>
  readonly subscribe: SubscribeFunction
}

export type ReleaseLockFunction = () => void;

export interface Adapter<Event> {
  readonly save: (event: Event) => Promise<void>
  readonly retrieve: () => Promise<unknown[]>
  readonly requestLock: () => Promise<ReleaseLockFunction>
}

export interface CreateEventStoreOptions<State, Event> {
  readonly parser: (event: unknown) => Event | Error,
  readonly adapter: Adapter<Event>,
  readonly replay: Replay<State, Event>
}

export function createEventStore<State, Event extends EventShape>(options: CreateEventStoreOptions<State, Event>): EventStore<State, Event> {
  const subscribers: Subscriber[] = [];

  async function saveEvent(event: Event): Promise<void> {
    await options.adapter.save(event);

    subscribers.forEach(notify => {
      notify();
    });
  }

  async function getState(): Promise<State | CorruptionError> {
    const events = await getEvents();

    if (events instanceof Error) {
      return events;
    }

    let state: State = options.state;

    for (const event of events) {
      state = options.replay(state, event);
    }

    return state;
  }

  async function getEvents() {
    const serializedEvents = await options.adapter.retrieve();
    const eventsOrErrors = serializedEvents.map(serializedEvent => options.parser(serializedEvent));

    const [events, corruptionError] = eventsOrErrors.reduce(([events, corruptionError], eventOrError) => {
      if (eventOrError instanceof Error) {
        return [events, new CorruptionError([...corruptionError.errors, eventOrError])];
      }

      return [[...events, eventOrError], corruptionError]
    }, [[], new CorruptionError([])] as [Event[], CorruptionError]);

    if (corruptionError.errors.length !== 0) {
      return corruptionError;
    }

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
    subscribe
  }
}