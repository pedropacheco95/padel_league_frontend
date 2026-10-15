// The app's vite config with the API proxy pointed at the e2e backend.
import path from "path";
import { mergeConfig } from "vite";
import base from "../vite.config.ts";

const backend = `http://127.0.0.1:${process.env.E2E_API_PORT ?? "5064"}`;

export default (env: { mode: string; command: "build" | "serve" }) =>
  mergeConfig(typeof base === "function" ? base(env) : base, {
    root: path.resolve(import.meta.dirname, ".."),
    server: { port: Number(process.env.E2E_WEB_PORT ?? 8084), strictPort: true, proxy: { "/api": { target: backend, changeOrigin: true } } },
  });
