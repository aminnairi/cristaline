import { defineEventStore } from "@cristaline/react"
import { EventShape, MemoryStateAdapter } from "@cristaline/core";
import { WebStorageEventAdapter } from "@cristaline/adapter-event-web-storage";
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
  parser: eventSchema.parse,
  eventAdapter: WebStorageEventAdapter.for<Event>({
    key: "events",
    storage: localStorage
  }),
  stateAdapter: MemoryStateAdapter.for<State>({
    state: {
      users: []
    }
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