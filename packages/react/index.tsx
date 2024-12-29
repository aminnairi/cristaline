import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Adapter, EventShape, EventStoreParser, Replay, createEventStore } from "@cristaline/core";

export interface EventStoreContextInterface<State, Event extends EventShape> {
  state: TransientState<Readonly<State>>,
  events: TransientState<ReadonlyArray<Event>>,
  saveEvent: (event: Event) => void,
  refresh: () => Promise<void>
}

export interface EventStoreProviderProps {
  children: ReactNode
}

export interface DefineStoreOptions<State, Event> {
  state: State,
  parser: EventStoreParser<Event>,
  adapter: Adapter<Event>,
  replay: Replay<State, Event>
}

export type Loading = {
  type: "loading"
}

export type Issue = {
  type: "issue",
  error: Error
}

export type Loaded<Value> = {
  type: "loaded",
  value: Value
}

export type TransientState<Value> = Loading | Issue | Loaded<Value>

export function defineEventStore<State, Event extends EventShape>(options: DefineStoreOptions<State, Event>) {
  const EventStoreContext = createContext<EventStoreContextInterface<State, Event>>({
    events: {
      type: "loading"
    },
    state: {
      type: "loading"
    },
    saveEvent: () => { },
    refresh: async () => { }
  });

  const eventStore = createEventStore<State, Event>({
    adapter: options.adapter,
    parser: options.parser,
    replay: options.replay,
    state: options.state
  });

  function EventStoreProvider({ children }: EventStoreProviderProps) {
    const [events, setEvents] = useState<TransientState<ReadonlyArray<Event>>>({
      type: "loading"
    });

    const [state, setState] = useState<TransientState<Readonly<State>>>({
      type: "loading"
    });

    const saveEvent = useMemo(() => async (event: Event) => {
      try {
        setEvents({
          type: "loading"
        });

        setState({
          type: "loading"
        });

        await eventStore.saveEvent(event);

        setState({
          type: "loaded",
          value: eventStore.getState()
        });

        setEvents({
          type: "loaded",
          value: eventStore.getEvents()
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

        setState({
          type: "loaded",
          value: eventStore.getState()
        });

        setEvents({
          type: "loaded",
          value: eventStore.getEvents()
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

    const value = useMemo((): EventStoreContextInterface<State, Event> => {
      return {
        state,
        events,
        saveEvent,
        refresh
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