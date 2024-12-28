import { defineEventStore } from "@aminnairi/evenstore-react"
import { WebStorageAdapter } from "@aminnairi/eventstore-web-storage";
import { z } from "zod"

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

export const { EventStoreProvider, useEventStore } = defineEventStore<State, Event>({
  parser: eventSchema.parse,
  state: {
    users: []
  },
  adapter: WebStorageAdapter.for({
    eventsKey: "events",
    storage: localStorage
  }),
  replay: (state, event) => {
    switch (event.type) {
      case "USER_CREATED":
        return {
          ...state,
          users: [
            ...state.users,
            event.data
          ]
        }

      case "USER_UPDATED":
        return {
          ...state,
          users: state.users.map(user => {
            if (user.id !== event.data.id) {
              return user;
            }

            return {
              ...user,
              ...event.data
            }
          })
        }
    }
  }
});