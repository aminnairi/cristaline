# @cristaline/core

An immutable database engine based on log streams.

## Requirements

- [Node](https://nodejs.org)
- [NPM](https://npmjs.com)

## Installation

```bash
npm install @cristaline/core
```

## API

### `createEventStore`

Create the shape of the event, and how to create a projection from those events.

### Example

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
  stateAdapter: MemoryStateAdapter.for<State>({
    state: {
      users: []
    }
  }),
  eventAdapter: MemoryEventAdapter.for<Event>({
    events: [],
    parser: eventSchema.parse,
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

### `initialize`

This function lets you initialize the state and events that are stored and retrieved from the storage system and mounts them in memory.

You'll need to run this method in order to get the initial state of your events.

If an error occurs, this typically means that the database has been altered from an outside source other than the script itself and does not respect the format expected when parsing the events.

#### Example

```typescript
const error = await eventStore.initialize();

if (error instanceof Error) {
  console.error("Database corrupted.");
} else {
  console.log("Database initialized.");
}
```

### `getEvents`

This is a simple getter for accessing the events log as an array.

#### Example

```typescript
const events = await eventStore.getEvents();

for (const event of events) {
  console.log(event.type);
}
```

### `getState`

This is also a getter method that will get you the actual state of your application computed from your events log.

```typescript
const state = await eventStore.getState();

for (const user of state.users) {
  console.log(user.email);
}
```

### `saveEvent`

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

### `transaction`

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

### `subscribe`

This method will help you react to any change in your event store whenever an event has been added.

```typescript
eventStore.subscribe(() => {
  console.log("New event added.");
});
```

## Changelog

### Summary

- [`1.0.0`](#100)
- [`0.1.0`](#010)

### 1.0.0

#### Major changes

- The `parser` property is now removed from the `createEventStore` function's arguments
- The `retrieve` method of the `EventAdapter` interface now return a `Promise<Event[]>` instead of just returning `Promise<unknown[]>`

#### Minor changes

None.

#### Bug & security fixes

None.

### 0.1.0

#### Major changes

None.

#### Minor changes

None.

#### Bug & security fixes

None.

## License

See [`LICENSE`](./LICENSE).