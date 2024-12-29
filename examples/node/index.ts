import { createEventStore } from "@cristaline/core";
import { z } from "zod";
import { NodeJsonStreamAdapter } from "@aminnairi/eventstore-node-json-stream";

const stateSchema = z.object({
  users: z.array(z.object({
    identifier: z.string(),
    email: z.string(),
    createdAt: z.date({ coerce: true }),
    updatedAt: z.date({ coerce: true })
  }))
});

const userCreatedEventSchema = z.object({
  type: z.literal("USER_CREATED"),
  version: z.literal(1),
  identifier: z.string().uuid(),
  date: z.date({ coerce: true }),
  data: z.object({
    identifier: z.string().uuid(),
    email: z.string().email(),
    createdAt: z.date({ coerce: true }),
    updatedAt: z.date({ coerce: true })
  })
});

const userDeletedEventSchema = z.object({
  type: z.literal("USER_DELETED"),
  version: z.literal(1),
  identifier: z.string().uuid(),
  date: z.date({ coerce: true }),
  data: z.object({
    identifier: z.string().uuid()
  })
});

const eventSchema = z.union([
  userCreatedEventSchema,
  userDeletedEventSchema,
]);

type State = z.infer<typeof stateSchema>

type Event = z.infer<typeof eventSchema>;

const { saveEvent, getState } = createEventStore<State, Event>({
  parser: eventSchema.parse,
  adapter: NodeJsonStreamAdapter.for({
    path: "database.jsonl",
  }),
  state: {
    users: []
  },
  replay: (state, event) => {
    switch (event.type) {
      case "USER_CREATED":
        return {
          ...state,
          users: [
            ...state.users,
            {
              createdAt: event.data.createdAt,
              email: event.data.email,
              identifier: event.data.identifier,
              updatedAt: event.data.updatedAt,
            },
          ]
        }

      case "USER_DELETED":
        return {
          ...state,
          users: state.users.filter(user => {
            return user.identifier !== event.data.identifier
          })
        };
    }
  }
});

console.log("Saving events...");

await Promise.all(Array.from(Array(10)).map(async (_, index) => {
  console.log(`Saving event #${index + 1}...`);

  await saveEvent({
    identifier: crypto.randomUUID(),
    type: "USER_CREATED",
    version: 1,
    date: new Date(),
    data: {
      identifier: crypto.randomUUID(),
      email: `${crypto.randomUUID()}@gmail.com`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  console.log("Saving event done.");
}));

const state = getState();

console.log(state);