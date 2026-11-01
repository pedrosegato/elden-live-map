# Elden Ring Live Map

A mod that shows your character on an interactive map while you play. Open it in any browser on your network: a second monitor, a phone, another computer.

- Every marker from the game's world, with categories and search
- Mark locations as found; progress is kept per save

## Install

1. Install [Elden Mod Loader](https://www.nexusmods.com/eldenring/mods/117).
2. Download `elden-live-map-<version>.zip` from [Releases](../../releases) and extract it into `ELDEN RING/Game/`.
3. Start the game, load a save and open `http://localhost:8686`. From another device, use `http://<pc-ip>:8686` and allow the Windows Firewall prompt for private networks.

Play offline with Easy Anti-Cheat disabled.

Settings go in `mods/elden-live-map/config.json`, for example `{ "bind": "0.0.0.0", "port": 8686 }`. The same folder holds the log and your saved progress.

## Development

Node.js 24+. The map data is not in this repository: extract `mods/elden-live-map/data/` from a release into `data/dataset/`.

```sh
npm install
npm run dev   # viewer and a mock game at http://127.0.0.1:5173
```

`GAME_URL=http://<pc-ip>:8686 npm run dev` points it at a running game instead.

## How it works

The DLL runs an HTTP server inside the game and serves the viewer, the map data and a small API from one origin.

| Endpoint                                  |                                                                                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/events`                         | Server-Sent Events: `session` (menu or in-game, with the character) and `position` (map block, coordinates, facing; up to 30 Hz) |
| `GET /api/progress`                       | Found locations for the loaded save                                                                                              |
| `PUT` / `DELETE /api/progress/found/{id}` | Mark or unmark a location                                                                                                        |
| `GET /api/debug`                          | Raw values read from the game                                                                                                    |

## License

[MIT](LICENSE). Not affiliated with FromSoftware or Bandai Namco. ELDEN RING is their trademark.
