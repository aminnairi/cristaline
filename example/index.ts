import { createEventDatabase, JsonStreamEventAdapter } from "../package";
import { z } from "zod";

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

const { saveEvent, getState, takeSnapshot } = await createEventDatabase<State, Event>({
  initialState: {
    users: []
  },
  eventAdapter: await JsonStreamEventAdapter.for({
    path: {
      events: "database/events.jsonl",
      archive: "database/archive.jsonl"
    },
    eventSchema,
    stateSchema
  }),
  replay: (state, event) => {
    switch (event.type) {
      case "SNAPSHOT":
        return event.data;

      case "USER_CREATED":
        return {
          ...state,
          users: [
            ...state.users,
            event.data
          ]
        }

      case "USER_DELETED":
        return {
          ...state,
          users: state.users.filter(user => {
            return user.identifier === event.data.identifier
          })
        }
    }
  }
});

// console.log("Saving events...");

// await Promise.all(Array.from(Array(40_000)).map(async (_, index) => {
//   console.log(`Saving event #${index + 1}...`);

//   await saveEvent({
//     identifier: crypto.randomUUID(),
//     type: "USER_CREATED",
//     date: new Date(),
//     data: {
//       identifier: crypto.randomUUID(),
//       email: `${crypto.randomUUID()}@gmail.com`,
//       createdAt: new Date(),
//       updatedAt: new Date()
//     }
//   });

//   console.log("Saving event done.");
// }));

// console.log("Taking snapshot...");

// await takeSnapshot();

// console.log("Snapshot done");

// console.log("Done saving events");

// const state = await getState();

// console.log(state.users.length);
