# cristaline

Repository for `@cristaline/*` packages.

## Packages

Package | Description
---|---
[`@cristaline/core`](./packages/core) | An immutable database based on log streams
[`@cristaline/node`](./packages/node) | Node.js adapters for @cristaline/core
[`@cristaline/web`](./packages/web) | Web API's bridge for cristaline
[`@cristaline/react`](./packages/react) | React.js bridge for cristaline

## Contributing

### Requirements

- Git
- Docker
- Docker Compose

### Clone the repository

```bash
git clone https://github.com/aminnairi/cristaline
cd cristaline
```

### Start the container

```bash
docker compose up --detach
```

### Install the dependencies

```bash
docker compose exec node npm install
```

### Start the Node example

```bash
docker compose exec node npm --workspace examples/node run dev
```

### Start the React example

```bash
docker compose exec node npm --workspace examples/react run dev
```

### Stop the container

```bash
docker compose down --remove-orphans --volumes --timeout 0
```

## What Is cristaline

Cristaline is a library designed to help you manage your database as a stream of logs instead of a constant final state.

Inspired by Event Sourcing, it allows you to capture a stream of immutable events that occur throughout the lifecycle of an application. These events serve as the single source of truth and can be reduced to derive the current state of your application at any point in time.

## Why Use cristaline

Traditional databases store only the final state of an application at a specific moment, limiting historical visibility. Cristaline, on the other hand, preserves the complete history of changes, enabling you to retrace your application’s state over time.

This approach provides:
- **Enhanced traceability**: Track every change since the inception of your data.
- **Fine-grained analytics**: Understand not just the current state but how it evolved.
- **Time-travel debugging**: Investigate past states to diagnose issues with precision.

cristaline is ideal for applications requiring robust auditing, analytics, and historical data insights.

## Who Is It For

This library is suited for:
- **Functional programming enthusiasts** who value immutability and state derivation through pure functions.
- **Businesses demanding high traceability** in analytics, auditing, and compliance, benefiting from the immutable nature of events rather than mutable state.

By storing events instead of derived states, you gain unparalleled visibility into what occurred, when, and why, making investigations and analyses significantly easier.

## Features

### State Reconstruction

State reconstruction involves reducing a series of events into a single, coherent state representation. This allows you to interact with your application's current state while maintaining the complete traceability and history of events.

### Event Versioning

As your application's requirements evolve, so will the structure of your events. Unlike traditional database systems that overwrite schema changes (e.g., `ALTER TABLE`), cristaline ensures that all historical data remains intact by introducing new event versions.

This approach allows:
- **Backward compatibility**: Preserve and utilize older events.
- **Forward evolution**: Support more complex business requirements without compromising historical data integrity.

Event versioning ensures that no information is lost, providing a secure and auditable evolution of your application’s state.

### Adapter Pattern

The library leverages the Adapter Pattern to enable seamless integration with any storage backend of your choice.

Whether you use the included Web Storage or Node.js adapters, or implement your own custom adapter, cristaline provides portability and the flexibility to decide where and how your data is stored while handling the core logic for you.

### Mutation-Free

One of the challenges of evolving a database schema is to keep the informations already stored, while mutating the database schema at the same time.

This can be especially difficult if you face data-loss due to schema changes. For instance, having a migration that would make a column go from a `DATETIME` to a `DATE`, only to be reverting this back due to some client expectation changing later, it would be impossible to retrieve past data this way unfortunately even when using migrations.

Cristaline does not have the concept of migration. Instead, as logs are immutable, it relies on a versioning system directly baked-in the event logs that you stored as the mechanism for evolving your state. That way, it becomes trivial to retrieve past data, or to ignore some columns due to some changes in the expected shape of you data.

Since the state is only a reduced version of all your logs, you can literally make your state evolve whenever you want, even if there are no structural changes in the shape of your events, this is what makes it a powerful solution for those who seek reliability and fast schema changes since it does not operate directly on the state but rather on the events.

### Portable

Cristaline is not tied to any type of storage, whether it is your memory, a file, a local database, a container, a remote database or a [lava lamp](https://www.cloudflare.com/learning/ssl/lava-lamp-encryption/), you can adapt any of these to work with cristaline.

This allow you to deploy, evolve and migrate your storage based on your needs or the available resources at the time being.

It also helps not tie you to a specific provider. You can even use it from any environment: Web, servers, mobile, desktop, wherever you can store values, cristaline will work.