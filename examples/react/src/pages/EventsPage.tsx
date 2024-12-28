import { useEventStore } from "../hooks/useEventStore"

export function EventsPage() {
  const { events } = useEventStore();

  if (events.type === "loading") {
    return (
      <h1>Loading</h1>
    );
  }

  if (events.type === "error") {
    return (
      <h1>Error</h1>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <td>Identifier</td>
          <td>Type</td>
          <td>Created at</td>
        </tr>
      </thead>
      <tbody>
        {events.events.map(event => (
          <tr key={event.identifier}>
            <td>{event.identifier}</td>
            <td>{event.type === "USER_CREATED" ? "User created" : event.type === "USER_UPDATED" ? "User updated" : "Unknown"}</td>
            <td>{event.date.toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}