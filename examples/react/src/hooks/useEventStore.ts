import { useEffect, useMemo, useState } from "react";
import { createEventStore } from "@aminnairi/eventstore"
import { WebStorageAdapter } from "@aminnairi/eventstore-web-storage"
import { z } from "zod";

const eventSchema = z.union([
  z.object({
    type: z.literal("USER_CREATED"),
    version: z.literal(1),
    identifier: z.string(),
    date: z.date({ coerce: true }),
    data: z.object({
      id: z.string(),
      email: z.string()
    })
  }),
  z.object({
    type: z.literal("USER_UPDATED"),
    version: z.literal(1),
    identifier: z.string().uuid(),
    date: z.date({ coerce: true }),
    data: z.object({
      id: z.string().uuid(),
      email: z.string().email()
    })
  })
])

type Event = z.infer<typeof eventSchema>

type State = {
  type: "state",
  users: {
    id: string,
    email: string
  }[]
}

type Issue = {
  type: "error",
  error: string
}

type Loading = {
  type: "loading"
}

type Events = {
  type: "events",
  events: Event[]
}

export function useEventStore() {
  const [state, setState] = useState<Loading | Issue | State>({
    type: "loading"
  });

  const [events, setEvents] = useState<Loading | Issue | Events>({
    type: "loading"
  });

  const eventStore = useMemo(() => createEventStore<State, Event>({
    parser: event => {
      return eventSchema.parse(event);
    },
    adapter: WebStorageAdapter.for({
      storage: localStorage,
      eventsKey: "events",
    }),
    replay: (events) => {
      const state: State = {
        type: "state",
        users: []
      }

      for (const event of events) {
        if (event.type === "USER_CREATED") {
          state.users.push({
            id: event.data.id,
            email: event.data.email
          });

          continue;
        }

        if (event.type === "USER_UPDATED") {
          const userIndex = state.users.findIndex(user => {
            return user.id === event.data.id
          });

          if (userIndex !== -1) {
            state.users.splice(userIndex, 1, {
              id: event.data.id,
              email: event.data.email
            });
          }

          continue;
        }
      }

      return state;
    },
  }), []);

  async function saveEvent(event: Event): Promise<void> {
    try {
      setState({
        type: "loading"
      });

      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });

      await eventStore.saveEvent(event);

      const state = await eventStore.getState();

      if (state instanceof Error) {
        throw state;
      }

      setState(state);
    } catch (error) {
      setState({
        type: "error",
        error: String(error)
      });
    }
  }

  async function getEvents() {
    try {
      setEvents({
        type: "loading"
      });

      const events = await eventStore.getEvents();

      if (events instanceof Error) {
        return events;
      }

      setEvents({
        type: "events",
        events
      });
    } catch (error) {
      setEvents({
        type: "error",
        error: String(error)
      });
    }
  }

  useEffect(() => {
    setEvents({
      type: "loading"
    });

    setState({
      type: "loading"
    });

    new Promise(resolve => {
      setTimeout(resolve, 2000);
    }).then(() => {
      return eventStore.getState()
    }).then(state => {
      if (state instanceof Error) {
        return Promise.reject(state);
      }

      setState(state);
    }).catch(error => {
      setState({
        type: "error",
        error: String(error)
      });
    });

    new Promise(resolve => {
      setTimeout(resolve, 2000);
    }).then(() => {
      return eventStore.getEvents()
    }).then(events => {
      if (events instanceof Error) {
        return Promise.reject(events);
      }

      setEvents({
        type: "events",
        events
      });
    }).catch(error => {
      setEvents({
        type: "error",
        error: String(error)
      });
    })
  }, [eventStore]);

  return {
    state,
    saveEvent,
    events,
    getEvents
  };
}