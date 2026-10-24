import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default defineConfig({
  root: path.join(root, "client"),
  plugins: [react()],
  resolve: {
    alias: { "@shared": path.join(root, "shared") },
  },
  server: {
    port: 5173,
    host: "127.0.0.1",
    fs: { allow: [root] },
    proxy: {
      "/api": { target: "http://127.0.0.1:8787", changeOrigin: true },
    },
  },
  build: {
    outDir: path.join(root, "dist"),
    emptyOutDir: true,
  },
});
