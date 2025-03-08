# @cristaline/web

## Requirements

- [Node](https://nodejs.org/)
- [NPM](https://npmjs.com/)

## Installation

```bash
npm create vite -- --template vanilla-ts project
cd project
npm install @cristaline/core @cristaline/web zod
touch src/main.ts
```

```typescript
import type { EventShape } from "@cristaline/core";
import type { ZodSchema } from "zod";

import { createEventStore, MemoryStateAdapter } from "@cristaline/core";
import { StorageEventAdapter } from "@cristaline/web";
import { z } from "zod";

const eventSchema = z.object({
  id: z.string(),
  date: z.date({ coerce: true }),
  type: z.literal("TodoAdded"),
  version: z.literal(1),
  data: z.object({
    id: z.string(),
    title: z.string()
  })
}) satisfies ZodSchema<EventShape>

type Todo = {
  id: string,
  title: string
}

type State = {
  todos: Array<Todo>
}

const eventStore = createEventStore({
  eventAdapter: StorageEventAdapter.for({
    storage: localStorage,
    key: "events",
    parser: eventSchema.parse
  }),
  stateAdapter: MemoryStateAdapter.for({
    todos: []
  }),
  replay: (state, event) => {
    return {
      ...state,
      todos: [
        ...state.todos,
        event.data
      ]
    }
  }
});

await eventStore.initialize();

console.log(eventStore.getState());
```

## Changelogs

### Versions

- [`0.1.0`](#010)

### 0.1.0

#### Major changes

None.

#### Minor changes

None.

#### Bug & security fixes

None.