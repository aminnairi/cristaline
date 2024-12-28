import { WebStorageAdapter } from "@aminnairi/eventstore-web-storage"
import { useEventStore } from "@aminnairi/evenstore-react"
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

type User = {
  id: string,
  email: string
}

type State = {
  users: User[]
}

export function useDatabase() {
  return useEventStore<State, Event>({
    adapter: WebStorageAdapter.for({
      storage: localStorage,
      eventsKey: "events"
    }),
    parser: event => {
      return eventSchema.parse(event);
    },
    replay: events => {
      const state: State = {
        users: []
      }

      for (const event of events) {
        if (event.type === "USER_CREATED") {
          state.users.push({
            email: event.data.email,
            id: event.data.id
          })

          continue;
        }

        if (event.type === "USER_UPDATED") {

          const userIndex = state.users.findIndex(user => {
            return user.id === event.data.id
          });

          if (userIndex !== -1) {
            state.users.splice(userIndex, 1, {
              email: event.data.email,
              id: event.data.id
            });
          }
        }
      }

      return state;
    }
  });
}