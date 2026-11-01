import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

const VIRTUAL_ID = "virtual:marker-icons";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const DEV_DATA_PATH = "/@marker-icons.bin";

function readIcons(directory: string) {
  const files = readdirSync(directory)
    .filter((name) => name.endsWith(".png"))
    .sort();
  const index: Record<string, [number, number]> = {};
  const parts: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const data = readFileSync(join(directory, file));
    index[file.slice(0, -".png".length)] = [offset, data.length];
    parts.push(data);
    offset += data.length;
  }
  return { files, index, data: Buffer.concat(parts) };
}

export function markerIconsPlugin(directory: string): Plugin {
  let serving = false;
  let base = "/";
  return {
    name: "marker-icons",
    configResolved(config) {
      serving = config.command === "serve";
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use(DEV_DATA_PATH, (_request, response) => {
        response.setHeader("Content-Type", "application/octet-stream");
        response.end(readIcons(directory).data);
      });
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const { files, index, data } = readIcons(directory);
      for (const file of files) this.addWatchFile(join(directory, file));
      let dataUrl = DEV_DATA_PATH;
      if (!serving) {
        const fileName = `assets/markers-${createHash("sha256").update(data).digest("hex").slice(0, 10)}.bin`;
        this.emitFile({ type: "asset", fileName, source: data });
        dataUrl = base + fileName;
      }
      return `export const index = ${JSON.stringify(index)};\nexport const dataUrl = ${JSON.stringify(dataUrl)};\n`;
    },
  };
}
