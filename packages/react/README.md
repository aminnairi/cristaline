# @cristaline/react

React.js bridge for `@cristaline/core`

[![NPM Version](https://img.shields.io/npm/v/%40cristaline%2Freact)](https://www.npmjs.com/package/@cristaline/react) [![NPM License](https://img.shields.io/npm/l/%40cristaline%2Freact)](./LICENSE) [![npm package minimized gzipped size (scoped)](https://img.shields.io/bundlejs/size/%40cristaline/react)](https://bundlejs.com/?q=%40cristaline%2Freact)

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
import { MemoryEvent, MemoryState } from "@cristaline/core";
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
  event: MemoryEvent.for({
    events: [],
    parser: eventSchema.parse
  }),
  state: MemoryState.for({
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

- [`1.0.0`](#100)
- [`0.1.0`](#010)

### 1.0.0

#### Major changes

- Renamed the `eventAdapter` property from the arguments of the `defineEventStore` function to `event`
- Renamed the `stateAdapter` property from the arguments of the `defineEventStore` function to `state`

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
