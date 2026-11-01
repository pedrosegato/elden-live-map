import { useEffect, useRef } from "react";

const LOCATION_HASH = /^#loc=(\d+)$/;

export function replaceLocationHash(locationId: number | null) {
  history.replaceState(null, "", locationId === null ? window.location.pathname : `#loc=${locationId}`);
}

export function useHashLocation(onLocation: (locationId: number) => void) {
  const handler = useRef(onLocation);

  useEffect(() => {
    handler.current = onLocation;
  });

  useEffect(() => {
    const read = () => {
      const match = LOCATION_HASH.exec(window.location.hash);
      if (match) handler.current(Number(match[1]));
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
}
