import { useCallback } from "react";
import { useEventStore } from "../hooks/useEventStore";
import { Link } from "react-router";

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

  if (state.type === "error") {
    return (
      <div>
        <h1>Error</h1>
        <pre>
          <code>
            {state.error}
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
          {state.users.map(user => (
            <tr key={user.email}>
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