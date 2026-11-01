import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, linkSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const datasetDir = join(root, "data", "dataset");
const viewerIndex = join(root, "viewer", "dist", "index.html");
const dllCandidates = [
  join(root, "mod", "target", "x86_64-pc-windows-msvc", "release", "elden_live_map.dll"),
  join(root, "mod", "target", "release", "elden_live_map.dll"),
];
const STORED_EXTENSIONS = ".webp:.pmtiles:.png";
const DEV_ONLY_DATA = ["icon-audit.json"];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function linkTree(source: string, target: string): void {
  if (statSync(source).isDirectory()) {
    mkdirSync(target, { recursive: true });
    for (const entry of readdirSync(source)) linkTree(join(source, entry), join(target, entry));
    return;
  }
  try {
    linkSync(source, target);
  } catch {
    copyFileSync(source, target);
  }
}

const version = /^version = "(.+)"$/m.exec(readFileSync(join(root, "mod", "Cargo.toml"), "utf8"))?.[1];
if (!version) fail("No version in mod/Cargo.toml.");

const dll = dllCandidates
  .filter((path) => existsSync(path))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
if (!dll) fail("No elden_live_map.dll found. Build the mod first.");
if (!existsSync(viewerIndex)) fail("No viewer/dist. Run npm run build, then rebuild the mod.");

if (statSync(viewerIndex).mtimeMs > statSync(dll).mtimeMs) fail("viewer/dist is newer than the DLL. Rebuild the mod.");
if (!existsSync(join(datasetDir, "manifest.json"))) fail("No dataset in data/dataset.");

const name = `elden-live-map-${version}`;
const stage = join(root, "release", name);
const archive = join(root, "release", "elden-live-map.zip");
rmSync(stage, { recursive: true, force: true });
rmSync(archive, { force: true });

mkdirSync(stage, { recursive: true });
linkTree(dll, join(stage, "elden_live_map.dll"));
linkTree(datasetDir, join(stage, "elden-live-map", "data"));
for (const devOnly of DEV_ONLY_DATA) rmSync(join(stage, "elden-live-map", "data", devOnly), { force: true });

mkdirSync(dirname(archive), { recursive: true });
execFileSync("zip", ["-r", "-q", "-n", STORED_EXTENSIONS, archive, "."], { cwd: stage, stdio: "inherit" });
rmSync(stage, { recursive: true, force: true });
console.log(`${archive} (${(statSync(archive).size / 1e6).toFixed(0)} MB)`);
