import { createEventStore, CreateEventStoreOptions, EventShape } from "@aminnairi/eventstore";
import { useCallback, useMemo, useState } from "react";

export type EventStoreLoading = {
  type: "loading"
}

export type EventStoreError = {
  type: "error",
  error: Error
}

export type EventStoreLoaded<State> = {
  type: "loaded",
  value: State
}

export type EventStoreState<State> = EventStoreLoading | EventStoreError | EventStoreLoaded<State>

export type EventStoreEventsLoading = {
  type: "loading"
}

export type EventStoreEventsLoaded<Event> = {
  type: "loaded",
  value: Event[]
}

export type EventStoreEventsError = {
  type: "error",
  error: Error
}

export type EventStoreEvents<Event> = EventStoreEventsLoading | EventStoreEventsError | EventStoreEventsLoaded<Event>

export function useEventStore<State, Event extends EventShape>(options: CreateEventStoreOptions<State, Event>) {
  const [state, setState] = useState<EventStoreState<State>>({
    type: "loading"
  });

  const [events, setEvents] = useState<EventStoreEvents<Event>>({
    type: "loading"
  });

  const eventStore = useMemo(() => {
    return createEventStore(options);
  }, []);

  const saveEvent = useCallback(async (event: Event) => {
    try {
      setState({
        type: "loading"
      });

      await eventStore.saveEvent(event);
      await fetchState();
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));

      setState({
        type: "error",
        error: normalizedError
      });
    }
  }, []);

  const fetchState = useCallback(async () => {
    try {
      setState({
        type: "loading"
      });

      const result = await eventStore.getState();

      if (result instanceof Error) {
        throw result;
      }

      setState({
        type: "loaded",
        value: result
      })
    } catch (error) {
      setState({
        type: "error",
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setEvents({
        type: "loading"
      });

      const result = await eventStore.getEvents();

      if (result instanceof Error) {
        throw result;
      }

      setEvents({
        type: "loaded",
        value: result
      })
    } catch (error) {
      setEvents({
        type: "error",
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }, []);

  return {
    state,
    events,
    saveEvent,
    fetchState,
    fetchEvents
  }
}