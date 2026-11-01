import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import sirv from "sirv";
import type { Plugin, PreviewServer, ViteDevServer } from "vite";
import { defineConfig } from "vitest/config";
import { markerIconsPlugin } from "./markerIcons";
import { mockGamePlugin } from "./mockGame";

const datasetDir = fileURLToPath(new URL("../data/dataset", import.meta.url));
const markerIconDir = fileURLToPath(new URL("icons/markers", import.meta.url));
const gameUrl = process.env.GAME_URL;
const isTest = Boolean(process.env.VITEST);

function serveDataset(directory: string): Plugin {
  const mount = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use("/data", sirv(directory, { dev: true, etag: true }));
  };
  return { name: "serve-dataset", configureServer: mount, configurePreviewServer: mount };
}

function devPlugins(): Plugin[] {
  if (isTest) return [];
  return [serveDataset(datasetDir), ...(gameUrl ? [] : [mockGamePlugin({ datasetDir })])];
}

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), tailwindcss(), markerIconsPlugin(markerIconDir), ...devPlugins()],
  resolve: { alias: { "@": fileURLToPath(new URL("src", import.meta.url)) } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",

    chunkSizeWarningLimit: 1400,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "maplibre", test: /node_modules[\\/](maplibre-gl|pmtiles)/ },
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    proxy: gameUrl ? { "/api": { target: gameUrl, changeOrigin: true } } : undefined,
  },
  test: { include: ["src/**/*.test.ts"] },
});
