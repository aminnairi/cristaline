import { Event, EventShape, Replay, State, TransactionCallbackFunction, createEventStore } from "@cristaline/core";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export interface EventStoreContextInterface<State, Event extends EventShape> {
  state: TransientState<Readonly<State>>,
  events: TransientState<ReadonlyArray<Event>>,
  saveEvent: (event: Event) => void,
  transaction: (callback: TransactionCallbackFunction) => void,
  refresh: () => Promise<void>
}

export interface EventStoreProviderProps {
  children: ReactNode
}

export interface DefineStoreOptions<GenericState, GenericEvent> {
  event: Event<GenericEvent>,
  state: State<GenericState>,
  replay: Replay<GenericState, GenericEvent>
}

export type Loading = {
  type: "loading"
}

export type Issue = {
  type: "issue",
  error: Error
}

export type Loaded<GenericValue> = {
  type: "loaded",
  value: GenericValue
}

export type TransientState<GenericValue> = Loading | Issue | Loaded<GenericValue>

export function defineEventStore<GenericState, GenericEvent extends EventShape>(options: DefineStoreOptions<GenericState, GenericEvent>) {
  const EventStoreContext = createContext<EventStoreContextInterface<GenericState, GenericEvent>>({
    events: {
      type: "loading"
    },
    state: {
      type: "loading"
    },
    transaction: async () => null,
    saveEvent: () => { },
    refresh: async () => { }
  });

  const eventStore = createEventStore<GenericState, GenericEvent>({
    event: options.event,
    state: options.state,
    replay: options.replay,
  });

  function EventStoreProvider({ children }: EventStoreProviderProps) {
    const [events, setEvents] = useState<TransientState<ReadonlyArray<GenericEvent>>>({
      type: "loading"
    });

    const [state, setState] = useState<TransientState<Readonly<GenericState>>>({
      type: "loading"
    });

    const saveEvent = useMemo(() => async (event: GenericEvent) => {
      try {
        setEvents({
          type: "loading"
        });

        setState({
          type: "loading"
        });

        await eventStore.saveEvent(event);

        const state = await eventStore.getState();
        const events = await eventStore.getEvents();

        if (events instanceof Error) {
          throw events;
        }

        setState({
          type: "loaded",
          value: state
        });

        setEvents({
          type: "loaded",
          value: events
        });
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));

        setState({
          type: "issue",
          error: normalizedError
        });
        setEvents({
          type: "issue",
          error: normalizedError
        });
      }
    }, []);

    const refresh = useMemo(() => async () => {
      try {
        setEvents({
          type: "loading"
        });

        setState({
          type: "loading"
        });

        const error = await eventStore.initialize();

        if (error instanceof Error) {
          return Promise.reject(error);
        }

        const state = await eventStore.getState();
        const events = await eventStore.getEvents();

        if (events instanceof Error) {
          throw events;
        }

        setState({
          type: "loaded",
          value: state
        });

        setEvents({
          type: "loaded",
          value: events
        });
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));

        setEvents({
          type: "issue",
          error: normalizedError
        });

        setState({
          type: "issue",
          error: normalizedError
        });
      }
    }, []);

    const transaction = useMemo(() => async (callback: TransactionCallbackFunction) => {
      try {
        setState({
          type: "loading"
        });

        setEvents({
          type: "loading"
        });

        const error = await eventStore.transaction(callback);

        if (error) {
          throw error;
        }

        const state = await eventStore.getState();
        const events = await eventStore.getEvents();

        if (events instanceof Error) {
          throw events;
        }

        setState({
          type: "loaded",
          value: state
        });

        setEvents({
          type: "loaded",
          value: events
        });
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));

        setState({
          type: "issue",
          error: normalizedError
        });

        setEvents({
          type: "issue",
          error: normalizedError
        });
      }
    }, []);

    const value = useMemo((): EventStoreContextInterface<GenericState, GenericEvent> => {
      return {
        state,
        events,
        saveEvent,
        refresh,
        transaction
      };
    }, [state, events]);

    useEffect(() => {
      refresh()
    }, []);

    return (
      <EventStoreContext.Provider value={value}>
        {children}
      </EventStoreContext.Provider>
    );
  }

  const useEventStore = () => {
    return useContext(EventStoreContext);
  }

  return {
    EventStoreProvider,
    useEventStore
  }
}