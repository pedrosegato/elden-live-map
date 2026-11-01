import type { ConnectionStatus, PositionSample, Session } from "./types";

const EVENTS_URL = "/api/events";

export interface GameEventHandlers {
  onStatus: (status: ConnectionStatus) => void;
  onSession: (session: Session) => void;
  onPosition: (sample: PositionSample) => void;
}

export function connectToGame({ onStatus, onSession, onPosition }: GameEventHandlers): () => void {
  const source = new EventSource(EVENTS_URL);
  onStatus("connecting");
  source.addEventListener("open", () => onStatus("online"));
  source.addEventListener("error", () => onStatus("offline"));
  source.addEventListener("session", (event) => onSession(JSON.parse(event.data) as Session));
  source.addEventListener("position", (event) => onPosition(JSON.parse(event.data) as PositionSample));
  return () => source.close();
}
