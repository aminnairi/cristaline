import { createEventStore } from "@cristaline/core";
import { z } from "zod";
import { NodeJsonStreamAdapter } from "@cristaline/node-json-stream";
import express from "express";

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

async function main() {
  const { saveEvent, transaction, getState, initialize } = createEventStore<State, Event>({
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

  const error = await initialize();

  if (error instanceof Error) {
    console.error("error while opening the database.");
    return;
  }

  const server = express();

  server.post("/users", async (request, response) => {
    try {
      await transaction(async ({ commit, rollback }) => {
        try {
          await Promise.all(Array.from(Array(10)).map(async (_, index) => {
            await saveEvent({
              identifier: crypto.randomUUID(),
              type: "USER_CREATED",
              version: 1,
              date: new Date(),
              data: {
                identifier: crypto.randomUUID(),
                email: `user-${index + 1}@gmail.com`,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
          }));

          await commit();
        } catch {
          rollback();
        }
      });

      response.status(201).end();
    } catch (error) {
      response.status(500).json({
        error: String(error)
      });
    }
  });

  server.get("/users", (request, response) => {
    const state = getState();

    response.status(200).json({
      users: state.users
    });
  });

  server.listen(8000, () => {
    console.log("Server listening on http://localhost:8000");
  });
}

main().catch(error => {
  console.error(error);
});