# cristaline

An immutable database engine based on log streams.

## Requirements

- [Node](https://nodejs.org)
- [NPM](https://npmjs.com)

## Installation

```bash
npm install @cristaline/core
```

## Adapter installation

You'll need an adapter, whether it is one that is included in this library or your own in order to use this library.

See below for a list of available adapters

## Packages

- [`@cristaline/core`](#cristalinecore)
- [`@cristaline/web-storage`](#cristalineweb-storage)
- [`@cristaline/node-json-stream`](#cristalinenode-json-stream)
- [`@cristaline/react`](#cristalinereact)

See [`examples`](./examples/) for a more detailed list of examples about how to use these libraries.

## @cristaline/core

Main module for creating and initializing the database.

### Installation

```bash
npm install @cristaline/core
```

### createEventStore

Create the shape of the event, and how to create a projection from those events.

#### Example

> [!NOTE]
> We recommend using a parser library like [Zod](https://zod.dev/) in order to validate the integrity of your events.

```typescript
import { EventShape, createEventStore, MemoryStateAdapter, MemoryEventAdapter } from "@cristaline/core";
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
  stateAdapter: MemoryStateAdapter.for<State>({
    state: {
      users: []
    }
  }),
  adapter: MemoryEventAdapter.for<Event>({
    events: []
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

This function lets you initialize the state and events that are stored and retrieved from the storage system and mounts them in memory to increase their access.

You'll need to run this method in order to get the initial state of your events.

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

This is a simple getter for accessing the events log as an array.

#### Example

```typescript
const events = await eventStore.getEvents();

for (const event of events) {
  console.log(event.type);
}
```

### getState

This is also a getter method that will get you the actual state of your application computed from your events log.

```typescript
const state = await eventStore.getState();

for (const user of state.users) {
  console.log(user.email);
}
```

### saveEvent

This method will allow you to save an event directly to your storage system.

It also add this event to the list of events mounted in memory, as well as computing again the state of your application.

Note that `saveEvent` will request a lock on the database, this means that if there should be multiple writes at the same times, it will wait until all other waits in the queue are done before commiting the changes.

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

### transaction

For the times where you need to prevent write before finishing an action while operating on the database, it can be great to lock the database while performing an algorithm, this method has been designed specifically for that purpose, letting you commit or rollback changes as the algorithm run.

Using the `saveEvent` method in here is highly unrecommended since it is already called by the `transaction` function after the callback returns and it could lead to data inconsistencies.

The `commit` function exposed inside the `transaction` callback is used to save all wanted events, while the `rollback` function is used to discard all events that should be saved in case of an error for instance.

```typescript
const usersToSave = [
  { email: "first@app.com" },
  { email: "second@app.com" },
  { email: "third@app.com" },
];

eventStore.transaction(async ({ commit, rollback }) => {
  try {
    const state = eventStore.getState();

    for (const user of users) {
      const shouldBeSaved = state.users.every(user => {
        return usersToSave.every(userToSave => {
          return userToSave.email !== user.email;
        });
      });

      if (shouldBeSaved) {
        await saveEvent({
          type: "USER_CREATED",
          identifier: crypto.randomUUID(),
          version: 1,
          date: new Date(),
          data: {
            id: crypto.randomUUID(),
            email: user.email,
          },
        });
      }
    }

    await commit();
  } catch {
    rollback();
  }
});
```

### subscribe

This method will help you react to any change in your event store whenever an event has been added.

```typescript
eventStore.subscribe(() => {
  console.log("New event added.");
});
```

## @cristaline/node-json-stream

Adapter for working with `@cristaline/core` using Node.js with the File API and JSON streams.

### Installation

```bash
npm install @cristaline/node-json-stream
```

### NodeJsonStreamAdapter.for

This method allows for creating a new adapter for creating an event store.

#### Example

> [!NOTE]
> We recommend using a parser library like [Zod](https://zod.dev/) in order to validate the integrity of your events.

```typescript
import { EventShape, createEventStore, MemoryStateAdapter } from "@cristaline/core";
import { NodeJsonStreamAdapter } from "@cristaline/node-json-stream";
import { ZodSchema, z } from "zod";

const eventSchema = z.object({
  type: z.literal("USER_CREATED"),
  identifier: z.string(),
  version: z.literal(1),
  date: z.date({ coerce: true }),
  data: z.object({
    id: z.string(),
    email: z.string()
  }),
}) satisfies ZodSchema<EventShape>;

type Event = z.infer<typeof eventSchema>;

type User = {
  id: string,
  email: string
}

type State = {
  users: Array<User>
}

const eventStore = createEventStore<State, Event>({
  parser: eventSchema.parse,
  eventAdapter: NodeJsonStreamAdapter.for({
    path: "events.jsonl"
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
            {
              id: event.data.id,
              email: event.data.email
            },
          ],
        };
    }
  },
});
```

## @cristaline/web-storage

Adapter for working with the Web Storage API using JSON streams.

### Installation

```bash
npm install @cristaline/web-storage
```

### WebStorageAdapter.for

This method allows for creating a new adapter for creating an event store.

> [!NOTE]
> We recommend using a parser library like [Zod](https://zod.dev/) in order to validate the integrity of your events.

```typescript
import { EventShape, createEventStore, MemoryStateAdapter } from "@cristaline/core";
import { WebStorageAdapter } from "@cristaline/web-storage";
import { ZodSchema, z } from "zod";

const eventSchema = z.object({
  type: z.literal("USER_CREATED"),
  identifier: z.string(),
  version: z.literal(1),
  date: z.date({ coerce: true }),
  data: z.object({
    id: z.string(),
    email: z.string()
  }),
}) satisfies ZodSchema<EventShape>;

type Event = z.infer<typeof eventSchema>;

type User = {
  id: string,
  email: string
}

type State = {
  users: Array<User>
}

const eventStore = createEventStore<State, Event>({
  parser: eventSchema.parse,
  eventAdapter: WebStorageAdapter.for({
    key: "events",
    storage: window.localStorage
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
            {
              id: event.data.id,
              email: event.data.email
            },
          ],
        };
    }
  },
});
```

## @cristaline/react

Bridge for working with `@cristaline/core` in a `react` application.

### Installation

```bash
npm install @cristaline/react
```

### defineEventStore

Define the event store for a React application.

> [!NOTE]
> We recommend using a parser library like [Zod](https://zod.dev/) in order to validate the integrity of your events.

```typescript
import { defineEventStore } from "@cristaline/evenstore-react"
import { EventShape, MemoryStateAdapter } from "@cristaline/core";
import { WebStorageAdapter } from "@cristaline/web-storage";
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
  eventAdapter: WebStorageAdapter.for<Event>({
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
```

### EventStoreProvider

React component used for initializing the event store.

This is required if you want to use the `useEventStore` hook.

#### Example

```tsx
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { EventStoreProvider } from './eventstore'

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Root element not found.");
}

createRoot(rootElement).render(
  <EventStoreProvider>
    <App />
  </EventStoreProvider>
);
```

### useEventStore

React hook used to access the functions exposed from an event store.

#### Example

```tsx
import { useCallback } from "react";
import { Link } from "react-router";
import { useEventStore } from "../eventstore";

export function HomePage() {
  const { state, saveEvent } = useEventStore();

  const addUser = useCallback(() => {
    saveEvent({
      type: "USER_CREATED",
      version: 1,
      identifier: crypto.randomUUID(),
      date: new Date(),
      data: {
        id: crypto.randomUUID(),
        email: `${crypto.randomUUID()}@gmail.com`
      }
    })
  }, [saveEvent]);

  if (state.type === "loading") {
    return (
      <h1>Loading</h1>
    );
  }

  if (state.type === "issue") {
    return (
      <div>
        <h1>Error</h1>
        <pre>
          <code>
            {state.error.message}
          </code>
        </pre>
      </div>
    );
  }

  return (
    <div>
      <button onClick={addUser}>
        Add user
      </button>
      <table>
        <tbody>
          {state.value.users.map(user => (
            <tr key={user.id}>
              <td>
                <Link to={`/users/${user.id}`}>{user.email}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Rationale

### What Is `cristaline`

`@cristaline/core` is a library designed to help you manage your database as a stream of logs instead of a constant final state.

Inspired by Event Sourcing, it allows you to capture a stream of immutable events that occur throughout the lifecycle of an application. These events serve as the single source of truth and can be reduced to derive the current state of your application at any point in time.

### Why Use `cristaline`

Traditional databases store only the final state of an application at a specific moment, limiting historical visibility. `cristaline`, on the other hand, preserves the complete history of changes, enabling you to retrace your application’s state over time.

This approach provides:
- **Enhanced traceability**: Track every change since the inception of your data.
- **Fine-grained analytics**: Understand not just the current state but how it evolved.
- **Time-travel debugging**: Investigate past states to diagnose issues with precision.

`cristaline` is ideal for applications requiring robust auditing, analytics, and historical data insights.

### Who Is It For

This library is suited for:
- **Functional programming enthusiasts** who value immutability and state derivation through pure functions.
- **Businesses demanding high traceability** in analytics, auditing, and compliance, benefiting from the immutable nature of events rather than mutable state.

By storing events instead of derived states, you gain unparalleled visibility into what occurred, when, and why, making investigations and analyses significantly easier.

## Features

### State Reconstruction

State reconstruction involves reducing a series of events into a single, coherent state representation. This allows you to interact with your application's current state while maintaining the complete traceability and history of events.

### Event Versioning

As your application's requirements evolve, so will the structure of your events. Unlike traditional database systems that overwrite schema changes (e.g., `ALTER TABLE`), `cristaline` ensures that all historical data remains intact by introducing new event versions.

This approach allows:
- **Backward compatibility**: Preserve and utilize older events.
- **Forward evolution**: Support more complex business requirements without compromising historical data integrity.

Event versioning ensures that no information is lost, providing a secure and auditable evolution of your application’s state.

### Adapter Pattern

The library leverages the Adapter Pattern to enable seamless integration with any storage backend of your choice.

Whether you use the included Web Storage or Node.js adapters, or implement your own custom adapter, `cristaline` provides portability and the flexibility to decide where and how your data is stored while handling the core logic for you.

### Mutation-Free

One of the challenges of evolving a database schema is to keep the informations already stored, while mutating the database schema at the same time.

This can be especially difficult if you face data-loss due to schema changes.

`cristaline` does not have the concept of migration. Instead, as logs are immutable, it relies on a versioning system directly baked-in the event logs that you stored as the mechanism for evolving your state.

Since the state is only a reduced version of all your logs, you can literally make your state evolve whenever you want, even if there are no structural changes in the shape of your events, this is what makes it a powerful solution for those who seek reliability and fast schema changes since it does not operate directly on the state but rather on the events.

### Portable

`cristaline` is not tied to any type of storage, whether it is your memory, a file, a local database, a container, a remote database, you can adapt any of these to work with `cristaline`.

This allow you to deploy, evolve and migrate your storage based on your needs or the available resources at the time being.

It also helps not tie you to a specific provider. You can even use it from any environment: Web, servers, mobile, desktop, wherever you can store values, `cristaline` will work.