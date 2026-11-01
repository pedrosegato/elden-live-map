import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Plugin, PreviewServer, ViteDevServer } from "vite";
import { fromWorld, invertMatrix } from "./src/lib/coordinates";
import type { Calibration, LngLat, MapEntry, Profile, Session } from "./src/lib/types";

const TICK_MS = 33;
const PING_MS = 15_000;
const MENU_DURATION_MS = 1_500;
const RIDE_SPEED_MPS = 18;
const ROUTE_STOPS = 8;
const AREA = "m60";
const ROUTE_CATEGORY = "Site of Grace";

type World = [number, number];

interface MockOptions {
  datasetDir: string;
}

interface MapFile {
  categories: { id: number; title: string }[];
  locations: { categoryId: number; positions: LngLat[] }[];
}

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8")) as T;
const distance = (a: World, b: World) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const round = (value: number) => Math.round(value * 1000) / 1000;

function planRoute(datasetDir: string): World[] {
  const manifest = readJson<{ maps: MapEntry[]; calibration: string }>(path.join(datasetDir, "manifest.json"));
  const calibration = readJson<Calibration>(path.join(datasetDir, manifest.calibration));
  const area = calibration.areas[AREA];
  const entry = manifest.maps.find((candidate) => candidate.id === area?.map);
  if (!area || !entry) throw new Error(`mock game: no calibrated ${AREA} map in ${datasetDir}`);
  const data = readJson<MapFile>(path.join(datasetDir, entry.data));
  const category = data.categories.find((candidate) => candidate.title === ROUTE_CATEGORY);
  const stops = data.locations
    .filter((location) => !category || location.categoryId === category.id)
    .flatMap((location) => (location.positions[0] ? [invertMatrix(area.matrix, location.positions[0])] : []));

  const route: World[] = [];
  let cursor = invertMatrix(area.matrix, entry.view.center);
  while (route.length < ROUTE_STOPS && stops.length > 0) {
    stops.sort((a, b) => distance(a, cursor) - distance(b, cursor));
    const next = stops.shift();
    if (!next) break;
    cursor = next;
    route.push(next);
  }
  return route;
}

function createProgressStore() {
  const byProfile = new Map<string, Set<number>>();
  const foundFor = (profileId: string) => {
    const existing = byProfile.get(profileId);
    if (existing) return existing;
    const created = new Set<number>();
    byProfile.set(profileId, created);
    return created;
  };
  return {
    list: (profileId: string) => [...foundFor(profileId)],
    set(profileId: string, locationId: number, found: boolean) {
      if (found) foundFor(profileId).add(locationId);
      else foundFor(profileId).delete(locationId);
    },
  };
}

function profileForSlot(slot: number): Profile {
  return { id: `mock-${slot}`, characterName: `Tarnished ${slot + 1}`, slot };
}

function sendJson(response: ServerResponse, status: number, body?: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(body === undefined ? undefined : JSON.stringify(body));
}

export function createMockGame({ datasetDir }: MockOptions) {
  const route = planRoute(datasetDir);
  const progress = createProgressStore();
  const clients = new Set<ServerResponse>();
  let session: Session = { state: "menu" };
  let world: World = route[0] ?? [0, 0];
  let nextStop = 1;
  let yaw = 0;

  function broadcast(event: string, data: unknown) {
    const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) client.write(chunk);
  }

  function setSession(next: Session) {
    session = next;
    world = route[0] ?? world;
    nextStop = 1;
    broadcast("session", session);
  }

  function step() {
    const target = route[nextStop];
    if (session.state !== "in-game" || !target) return;
    const remaining = distance(target, world);
    const stride = (RIDE_SPEED_MPS * TICK_MS) / 1000;
    if (remaining <= stride) {
      nextStop = (nextStop + 1) % route.length;
      world = nextStop === 0 ? (route[0] ?? target) : target;
      if (nextStop === 0) nextStop = 1;
    } else {
      const dx = target[0] - world[0];
      const dz = target[1] - world[1];
      world = [world[0] + (dx / remaining) * stride, world[1] + (dz / remaining) * stride];
      yaw = Math.atan2(dx, dz);
    }
    const { mapId, position } = fromWorld(AREA, world);
    broadcast("position", { t: Date.now(), mapId, position: position.map(round), yaw: round(yaw) });
  }

  function openStream(request: IncomingMessage, response: ServerResponse) {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    response.write(`retry: 1000\n\nevent: session\ndata: ${JSON.stringify(session)}\n\n`);
    clients.add(response);
    request.on("close", () => clients.delete(response));
  }

  function handle(request: IncomingMessage, response: ServerResponse, next: () => void) {
    const url = new URL(request.url ?? "/", "http://mock");
    const foundMatch = url.pathname.match(/^\/progress\/found\/(\d+)$/);

    if (request.method === "GET" && url.pathname === "/events") {
      openStream(request, response);
      return;
    }
    if (request.method === "POST" && url.pathname === "/_mock/session") {
      const slot = Number(url.searchParams.get("slot") ?? 0);
      setSession(
        url.searchParams.get("state") === "menu"
          ? { state: "menu" }
          : { state: "in-game", profile: profileForSlot(slot) },
      );
      sendJson(response, 204);
      return;
    }
    if (url.pathname === "/progress" || foundMatch) {
      if (session.state !== "in-game") {
        sendJson(response, 409, { error: "no-session" });
        return;
      }
      const profileId = session.profile.id;
      if (request.method === "GET" && url.pathname === "/progress") {
        sendJson(response, 200, { profileId, found: progress.list(profileId) });
        return;
      }
      if (foundMatch && (request.method === "PUT" || request.method === "DELETE")) {
        progress.set(profileId, Number(foundMatch[1]), request.method === "PUT");
        sendJson(response, 204);
        return;
      }
    }
    next();
  }

  const timers = [
    setInterval(step, TICK_MS),
    setInterval(() => {
      for (const client of clients) client.write(": ping\n\n");
    }, PING_MS),
    setTimeout(() => setSession({ state: "in-game", profile: profileForSlot(0) }), MENU_DURATION_MS),
  ];

  return {
    handle,
    stop() {
      for (const timer of timers) clearInterval(timer);
      for (const client of clients) client.end();
    },
  };
}

export function mockGamePlugin(options: MockOptions): Plugin {
  const mount = (server: ViteDevServer | PreviewServer) => {
    const game = createMockGame(options);
    server.middlewares.use("/api", game.handle);
    server.httpServer?.once("close", game.stop);
  };
  return { name: "mock-game", configureServer: mount, configurePreviewServer: mount };
}
