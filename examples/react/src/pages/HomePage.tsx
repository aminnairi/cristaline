import { useCallback } from "react";
import { Link } from "react-router";
import { useEventStore } from "../eventstore";

export function HomePage() {
  const { state, transaction } = useEventStore();

  const addUser = useCallback(() => {
    if (state.type !== "loaded") {
      return;
    }

    transaction(async ({ commit, rollback }) => {
      const email = `${crypto.randomUUID()}@gmail.com`;

      if (state.value.users.some(user => user.email === email)) {
        rollback();
        return;
      }

      commit({
        type: "USER_CREATED",
        version: 1,
        identifier: crypto.randomUUID(),
        date: new Date(),
        data: {
          id: crypto.randomUUID(),
          email,
        },
      });
    })
  }, [state, transaction]);

  if (state.type === "loading") {
    return (
      <h1>Loading</h1>
    );
  }

  if (state.type === "issue") {
    return (
      <div>
        <h1>Error</h1>
        <pre>
          <code>
            {state.error.message}
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
          {state.value.users.map(user => (
            <tr key={user.id}>
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