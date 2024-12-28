# @aminnairi/eventstore

An immutable database engine built on the Event Sourcing pattern.

## Requirements

- [Node](https://nodejs.org)
- [NPM](https://npmjs.com)

## Installation

```bash
npm install @aminnairi/eventstore
```

## Adapter installation

You'll need an adapter, whether it is one that is included in this library or your own in order to use this library.

See below for a list of available adapters

## Packages

Package | Type | Description
---|---|---
`@aminnairi/eventstore` | Core Library | An immutable database engine built on the Event Sourcing pattern.
`@aminnairi/eventstore-web-storage` | Adapter | Web Storage API adapter for `@aminnairi/eventstore`
`@aminnairi/eventstore-node-json-stream` | Adapter | Node.js File API with JSON Stream adapter for `@aminnairi/eventstore`
`@aminnairi/eventstore-react` | Framework Bridge | React Hook for `@aminnairi/eventstore`

## Usage

Here is an example usage of this library in the context of a Web application.

> [!NOTE]
> We recommend using a parser library like [Zod](https://zod.dev/) in order to validate the integrity of your events.

```typescript
import { EventShape, createEventStore } from "@aminnairi/eventstore"
import { WebStorageAdapter } from "@aminnairi/eventstore-web-storage"
import { ZodSchema, z } from "zod";

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

interface User {
  id: string,
  email: string
}

type State = {
  users: User[]
}

const eventStore = createEventStore<State, Event>({
  initialState: {
    type: "state",
    users: []
  },
  parser: event => {
    return eventSchema.parse(event);
  },
  adapter: WebStorageAdapter.for({
    storage: localStorage,
    eventsKey: "events",
  }),
  replay: (events) => {
    const state: State = {
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
  }
});

await eventStore.saveEvent({
  type: "USER_CREATED",
  version: 1,
  identifier: crypto.randomUUID(),
  date: new Date(),
  data: {
    id: crypto.randomUUID(),
    email: "first@app.com"
  }
});

const secondUserId = crypto.randomUUID();

await eventStore.saveEvent({
  type: "USER_CREATED",
  version: 1,
  identifier: crypto.randomUUID(),
  date: new Date(),
  data: {
    id: secondUserId,
    email: "second@app.com"
  }
});

await eventStore.saveEvent({
  type: "USER_UPDATED",
  version: 1,
  identifier: crypto.randomUUID(),
  date: new Date(),
  data: {
    id: secondUserId,
    email: "second@app.io"
  }
});

const state = await eventStore.getState();

if (state instanceof Error) {
  console.error("Corrupted database");
} else {
  console.log(`There is currently ${state.users.length} users in state.`);
}

const events = eventStore.getEvents();

if (events instanceof Error) {
  console.error("Corrupted database");
} else {
  console.log(`There is currently ${events.length} events in store.`);
}
```

See [`examples`](../../examples/) for a more detailed list of examples.

## @aminnairi/eventstore

### createEventStore

#### Example

```typescript
import { EventShape, createEventStore } from "@aminnairi/eventstore";
import { ZodSchema, z } from "zod";

const eventSchema = z.union([
  z.object({
    type: z.literal("USER_CREATED"),
    version: z.literal(1),
    identifier: z.string(),
    date: z.date({ coerce: true }),
    data: z.object({
      id: z.string(),
      email: z.string(),
    }),
  }) satisfies ZodSchema<EventShape>,
  z.object({
    type: z.literal("USER_UPDATED"),
    version: z.literal(1),
    identifier: z.string(),
    date: z.date({ coerce: true }),
    data: z.object({
      id: z.string(),
      email: z.string(),
    }),
  }) satisfies ZodSchema<EventShape>,
]);

type Event = z.infer<typeof eventSchema>

type User = {
  email: string
}

type State = {
  users: Array<User>
}

const eventStore = createEventStore<State, Event>({
  parser: eventSchema.parse,
  state: {
    users: []
  },
  adapter: WebStorageAdapter.for({
    key: "events",
    storage: window.localStorage,
  }),
  replay: (state, event) => {
    switch (event.type) {
      case "USER_CREATED":
        return {
          ...state,
          users: [
            ...state.users,
            user,
          ],
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
              ...event.data,
            };
          }),
        }
    }
  },
});
```

### initialize

#### Example

```typescript
const error = await eventStore.initialize();

if (error instanceof Error) {
  console.error("Database corrupted.");
} else {
  console.log("Database initialized.");
}
```

### getEvents

#### Example

```typescript
const events = eventStore.getEvents();

for (const event of events) {
  console.log(event.type);
}
```

### getState

```typescript
const state = eventStore.getState();

for (const user of state.users) {
  console.log(user.email);
}
```

### saveEvent

#### Example

```typescript
const error = await eventStore.saveEvent({
  type: "USER_CREATED",
  version: 1,
  date: new Date(),
  identifier: crypto.randomUUID(),
  data: {
    id: crypto.randomUUID(),
    email: "first@app.com",
  },
});

if (error instanceof Error) {
  console.error("Failed to create a new user.");
} else {
  console.log("User created successfully");
}
```

### subscribe

```typescript
eventStore.subscribe(() => {
  console.log("New event added.");
});
```

## What Is `@aminnairi/eventstore`

`@aminnairi/eventstore` is a library designed to implement the Event Sourcing pattern.

Event Sourcing allows you to capture a stream of immutable events that occur throughout the lifecycle of an application. These events serve as the single source of truth and can be reduced to derive the current state of your application at any point in time.

## Why Use Event Sourcing

Traditional databases store only the final state of an application at a specific moment, limiting historical visibility. Event Sourcing, on the other hand, preserves the complete history of changes, enabling you to retrace your application’s state over time.

This approach provides:
- **Enhanced traceability**: Track every change since the inception of your data.
- **Fine-grained analytics**: Understand not just the current state but how it evolved.
- **Time-travel debugging**: Investigate past states to diagnose issues with precision.

Event Sourcing is ideal for applications requiring robust auditing, analytics, and historical data insights.

## Who Is It For

This library is suited for:
- **Functional programming enthusiasts** who value immutability and state derivation through pure functions.
- **Businesses demanding high traceability** in analytics, auditing, and compliance, benefiting from the immutable nature of events rather than mutable state.

By storing events instead of derived states, you gain unparalleled visibility into what occurred, when, and why, making investigations and analyses significantly easier.

## State Reconstruction

State reconstruction involves reducing a series of events into a single, coherent state representation. This allows you to interact with your application's current state while maintaining the complete traceability and history of events.

## Event Versioning

As your application's requirements evolve, so will the structure of your events. Unlike traditional database systems that overwrite schema changes (e.g., `ALTER TABLE`), Event Sourcing ensures that all historical data remains intact by introducing new event versions.

This approach allows:
- **Backward compatibility**: Preserve and utilize older events.
- **Forward evolution**: Support more complex business requirements without compromising historical data integrity.

Event versioning ensures that no information is lost, providing a secure and auditable evolution of your application’s state.

## Adapter Pattern

The library leverages the Adapter Pattern to enable seamless integration with any storage backend of your choice.

Whether you use the included Web Storage or Node.js JSON Stream adapters, or implement your own custom adapter, `@aminnairi/eventstore` provides portability and the flexibility to decide where and how your data is stored while handling the core Event Sourcing logic for you.
