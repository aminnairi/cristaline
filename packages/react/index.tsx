import { EventShape, EventStoreParser, Replay } from "@aminnairi/eventstore";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { createEventStore } from "@aminnairi/eventstore";
import { WebStorageAdapter } from "@aminnairi/eventstore-web-storage";

export interface EventStoreContextInterface<State, Event extends EventShape> {
  state: TransientState<State>,
  events: TransientState<Event[]>,
  fetchState: () => void,
  fetchEvents: () => void,
  saveEvent: (event: Event) => void
}

export interface EventStoreProviderProps {
  children: ReactNode
}

export interface DefineStoreOptions<State, Event> {
  state: State,
  parser: EventStoreParser<Event>,
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
    fetchEvents: () => { },
    fetchState: () => { },
    saveEvent: () => { }
  });

  const eventStore = createEventStore<State, Event>({
    adapter: WebStorageAdapter.for({
      eventsKey: "events",
      storage: localStorage
    }),
    parser: options.parser,
    replay: options.replay,
    state: options.state
  });

  function EventStoreProvider({ children }: EventStoreProviderProps) {
    const [events, setEvents] = useState<TransientState<Event[]>>({
      type: "loading"
    });

    const [state, setState] = useState<TransientState<State>>({
      type: "loading"
    });

    const saveEvent = useMemo(() => async (event: Event) => {
      try {
        setEvents({
          type: "loading"
        });

        await eventStore.saveEvent(event);

        await Promise.all([
          fetchEvents(),
          fetchState()
        ]);
      } catch (error) {
        setEvents({
          type: "issue",
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    }, []);

    const fetchEvents = useMemo(() => async () => {
      try {
        setEvents({
          type: "loading"
        });

        const newEvents = await eventStore.getEvents();

        if (newEvents instanceof Error) {
          throw newEvents;
        }

        setEvents({
          type: "loaded",
          value: newEvents
        });
      } catch (error) {
        setEvents({
          type: "issue",
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    }, []);

    const fetchState = useMemo(() => async () => {
      try {
        setState({
          type: "loading"
        });

        const newState = await eventStore.getState();

        if (newState instanceof Error) {
          throw newState;
        }

        setState({
          type: "loaded",
          value: newState
        });
      } catch (error) {
        setState({
          type: "issue",
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    }, []);

    const value = useMemo((): EventStoreContextInterface<State, Event> => {
      return {
        state,
        events,
        fetchEvents,
        fetchState,
        saveEvent
      };
    }, [state, events]);

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