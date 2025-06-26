import { defineEventStore } from "@cristaline/react"
import { EventShape, MemoryState } from "@cristaline/core";
import { StorageEvent } from "@cristaline/web";
import { z, ZodSchema } from "zod"

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
  }) satisfies ZodSchema<EventShape>,
  z.object({
    type: z.literal("USER_UPDATED"),
    version: z.literal(1),
    identifier: z.string().uuid(),
    date: z.date({ coerce: true }),
    data: z.object({
      id: z.string().uuid(),
      email: z.string().email()
    })
  }) satisfies ZodSchema<EventShape>
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
  event: StorageEvent.for<Event>({
    key: "events",
    storage: localStorage,
    parser: eventSchema.parse,
  }),
  state: MemoryState.for<State>({
    state: {
      users: []
    }
  }),
  replay: {
    USER_CREATED: (state, event) => {
      return {
        ...state,
        users: [
          ...state.users,
          event.data
        ]
      }
    },
    USER_UPDATED: (state, event) => {
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
  },
});