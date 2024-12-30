import { useParams } from "react-router";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useEventStore } from "../eventstore";

export function UserDetailsPage() {
  const { saveEvent, state, transaction } = useEventStore();
  const params = useParams();
  const userId = useMemo(() => params["userId"], [params]);
  const [email, setEmail] = useState("");

  const user = useMemo(() => {
    if (state.type !== "loaded") {
      return;
    }

    return state.value.users.find(user => {
      return user.id === userId
    });
  }, [state, userId]);

  const onEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  }, []);

  const onUserFormSubmit = useCallback((event: FormEvent) => {
    event.preventDefault();

    if (!userId) {
      return;
    }

    transaction(async ({ commit, rollback }) => {
      try {
        if (state.type !== "loaded") {
          rollback();
          return;
        }

        if (state.value.users.some(user => user.email === email)) {
          rollback();
          return;
        }

        saveEvent({
          date: new Date(),
          identifier: crypto.randomUUID(),
          type: "USER_UPDATED",
          version: 1,
          data: {
            email,
            id: userId
          }
        });

        await commit();

      } catch {
        rollback();
      }
    });
  }, [saveEvent, transaction, state, userId, email]);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
    }
  }, [user]);

  if (state.type === "loading") {
    return (
      <h1>Loading</h1>
    );
  }

  if (state.type === "issue") {
    return (
      <h1>Error</h1>
    );
  }

  if (!user) {
    return (
      <h1>User not found</h1>
    );
  }

  return (
    <form onSubmit={onUserFormSubmit}>
      <input type="email" value={email} onChange={onEmailChange} />
      <button type="submit">
        Update
      </button>
    </form>
  );
}