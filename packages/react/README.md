# @cristaline/react

React.js bridge for `@cristaline/core`

## Requirements

- [Node](https://nodejs.org/)
- [NPM](https://npmjs.com/)

## Usage

```bash
npm create vite -- --template react-ts project
cd project
npm install @cristaline/core @cristaline/react zod
```

> [!WARNING]
> It is highly recommended to use a parsing library like [Zod](https://zod.dev/) in order to ease the creation of robust and resilient schemas, but you can use any library of your choice.

```bash
touch src/event-store.ts
```

```tsx
import type { EventShape } from "@cristaline/core";
import type { ZodSchema } from "zod";

import { defineEventStore } from "@cristaline/react"
import { MemoryEventAdapter, MemoryStateAdapter } from "@cristaline/core";
import { z } from "zod"

const eventSchema = z.object({
  type: z.literal("TodoAdded"),
  version: z.literal(1),
  identifier: z.string(),
  date: z.date({ coerce: true }),
  data: z.object({
    id: z.string(),
    title: z.string()
  })
}) satisfies ZodSchema<EventShape>;

type Event = z.infer<typeof eventSchema>

type Todo = {
  id: string,
  title: string
}

type State = {
  todos: Todo[]
}

export const { EventStoreProvider, useEventStore } = defineEventStore<State, Event>({
  eventAdapter: MemoryEventAdapter.for({
    events: [],
    parser: eventSchema.parse
  }),
  stateAdapter: MemoryStateAdapter.for({
    state: {
      todos: []
    }
  }),
  replay: (state, event) => {
    switch (event.type) {
      case "TodoAdded":
        return {
          ...state,
          todos: [
            ...state.todos,
            event.data
          ]
        }
    }
  }
});
```

```bash
touch src/main.tsx
```

```tsx
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { EventStoreProvider } from './eventstore'

createRoot(document.getElementById('root')!).render(
  <EventStoreProvider>
    <App />
  </EventStoreProvider>
)
```

```bash
touch src/App.tsx
```

```tsx
import { useEventStore } from "./event-store";

export default function App() {
  const eventStore = useEventStore();

  return null;
}
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

## License

See [`LICENSE`](./LICENSE).
