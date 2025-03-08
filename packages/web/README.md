# @cristaline/web

Web bridge for the `@cristaline/core` package

[![NPM Version](https://img.shields.io/npm/v/%40cristaline%2Fweb)](https://www.npmjs.com/package/@cristaline/web) [![NPM License](https://img.shields.io/npm/l/%40cristaline%2Fweb)](./LICENSE) [![npm package minimized gzipped size (scoped)](https://img.shields.io/bundlejs/size/%40cristaline/web)](https://bundlejs.com/?q=%40cristaline%2Fweb)

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

import { createEventStore, MemoryState } from "@cristaline/core";
import { StorageEvent } from "@cristaline/web";
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
  event: StorageEvent.for({
    storage: localStorage,
    key: "events",
    parser: eventSchema.parse
  }),
  state: MemoryState.for({
    state: {
      todos: []
    }
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

- [`1.0.0`](#100)
- [`0.1.0`](#010)

### 1.0.0

#### Major changes

- Renamed the `StorageEventAdapter` class to `StorageEvent`

### 0.1.0

#### Major changes

None.

#### Minor changes

None.

#### Bug & security fixes

None.