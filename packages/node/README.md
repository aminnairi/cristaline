# @cristaline/node

Node adapters for `@cristaline/core`

[![NPM Version](https://img.shields.io/npm/v/%40cristaline%2Fnode)](https://www.npmjs.com/package/@cristaline/node) [![NPM License](https://img.shields.io/npm/l/%40cristaline%2Fnode)](./LICENSE) [![npm package minimized gzipped size (scoped)](https://img.shields.io/bundlejs/size/%40cristaline/node)](https://bundlejs.com/?q=%40cristaline%2Fnod)

## Installation

```bash
npm install @cristaline/node
```

## Usage

```typescript
import type { EventShape } from "@cristaline/core";
import type { ZodSchema } from "zod";

import { JsonStreamEvent } from "@cristaline/node";
import { MemoryState, createEventStore } from "@cristaline/core";
import { z } from "zod";

const eventSchema = z.object({
  todos: z.array(z.object({
    id: z.string(),
    data: z.date({ coerce: true }),
    type: z.literal("TodoAdded"),
    version: z.literal(1),
    data: z.object({
      id: z.string(),
      title: z.string()
    })
  })) satisfies ZodSchema<EventShape>
});

type Event = z.infer<typeof eventSchema>

type Todo = {
  id: string,
  title: string
}

type State = {
  todos: Array<Todo>
}

createEventStore({
  event: JsonStreamEvent.for({
    path: "database.jsonl",
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
        };
    }
  }
});
```

## Usage

### JsonStreamEvent

Adapter for events that utilizes the JSONL standard to store events in a file.

It is an array of JSON objects that is infinite and that has no closing bracket for the wrapper array. Allows for extremely fast insertion while being easy to manipulate when retrieving data.

#### JsonStreamEvent.for

Method used to initialize a new instanceo of the `JsonStreamEvent` class, which adheres to the `Event` interface from the `@cristaline/core` library.

> [!NOTE]
> You don't have to strictly call the file extension `jsonl`, this is simply used for better debugging if you ever need to open that file in a text editor.

> [!WARN]
> It is recommended that you use a schema parsing library like [`zod`](https://zod.dev/) in order to create robust and resilient parser functions.

```typescript
import type { EventShape } from "@cristaline/core";

import { JsonStreamEvent } from "@cristaline/node";
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

JsonStreamEvent.for({
  path: "./path/to/your/database.jsonl",
  parse: eventSchema.parse
});
```

## Changelog

### Versions

- [`1.0.0`](#100)
- [`0.1.0`](#010)

### 1.0.0

#### Major changes

- Renamed the `JsonStreamEventAdapter` class to `JsonStreamEvent`
- Renamed the `JsonStreamEventAdapterOptions` interface to `JsonStreamEventOptions`

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