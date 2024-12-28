import { useParams } from "react-router";
import { useEventStore } from "../hooks/useEventStore";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";

export function UserDetailsPage() {
  const { state, saveEvent } = useEventStore();
  const params = useParams();
  const userId = useMemo(() => params["userId"], [params]);
  const user = useMemo(() => state.type === "state" && state.users.find(user => user.id === userId), [userId, state]);
  const [email, setEmail] = useState("");

  const onEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  }, []);

  const onUserFormSubmit = useCallback((event: FormEvent) => {
    event.preventDefault();

    if (!userId) {
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
  }, [userId, saveEvent, email]);

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

  if (state.type === "error") {
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