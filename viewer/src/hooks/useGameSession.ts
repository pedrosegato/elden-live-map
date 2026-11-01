import { useCallback, useEffect, useRef, useState } from "react";
import { connectToGame } from "../lib/gameEvents";
import { fetchFound, saveFound } from "../lib/progressApi";
import type { ConnectionStatus, PositionSample, Profile } from "../lib/types";

export type PositionListener = (sample: PositionSample) => void;

const NOTHING_FOUND: ReadonlySet<number> = new Set();

function withFound(found: ReadonlySet<number>, locationId: number, isFound: boolean): ReadonlySet<number> {
  const next = new Set(found);
  if (isFound) next.add(locationId);
  else next.delete(locationId);
  return next;
}

export function useGameSession() {
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [found, setFound] = useState<ReadonlySet<number>>(NOTHING_FOUND);
  const listeners = useRef(new Set<PositionListener>());

  useEffect(() => {
    let generation = 0;
    const endSession = () => {
      generation++;
      setProfile(null);
      setFound(NOTHING_FOUND);
    };

    return connectToGame({
      onStatus(status) {
        if (status === "offline") endSession();
        setConnection(status);
      },
      async onSession(session) {
        if (session.state !== "in-game") {
          endSession();
          return;
        }
        const current = ++generation;
        const ids = await fetchFound().catch(() => new Set<number>());
        if (current !== generation) return;
        setProfile(session.profile);
        setFound(ids);
      },
      onPosition(sample) {
        for (const listener of listeners.current) listener(sample);
      },
    });
  }, []);

  const subscribePosition = useCallback((listener: PositionListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const toggleFound = useCallback(
    (locationId: number) => {
      const isFound = !found.has(locationId);
      setFound((current) => withFound(current, locationId, isFound));
      saveFound(locationId, isFound).catch(() => setFound((current) => withFound(current, locationId, !isFound)));
    },
    [found],
  );

  return { connection, profile, found, subscribePosition, toggleFound };
}
