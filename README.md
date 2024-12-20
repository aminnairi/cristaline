# @aminnairi/eventstore

Immutable database engine leveraging events instead of finite state

## Features

### Adaptative

This library has been made to be adapted for any database of your choice.

Out of the box, you'll find an adapter that is based on the JSONL specification and that is capable of acquiring a lease on the database to prevent concurrent reads & writes and enabling safe and immutable sequential database access for all clients.

### Immutability

This library is based on Functional Programming principles at its core, and immutability offers guarantees over the data that is created and inserted, preventing mistakes by overriding a state by mistake.

### Auditable

Events are at the heart of this library, and they make for a wonderful auditable database when combined with replays, so that you don't fear loss of data, and you can always go back and read the logs of every events that has occured previously

### Snapshot

Snapshots offers a significant boost in terms of performance, allowing you to resolve one of the downsides of replaying all events, which can be quite long when dealing with thousands of events.

## Installation

```bash
npm i @aminnairi/eventstore
```

## Example

See [`example`](./example).