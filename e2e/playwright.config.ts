import { defineConfig, devices } from "@playwright/test";
import path from "path";

// Backend checkout and database prefix; defaults are S6's worktree and ports.
const BACKEND = process.env.BACKEND ?? path.resolve(__dirname, "../../padelleague-s6");
const PREFIX = process.env.TEST_DB_PREFIX ?? "s6";
const API = process.env.E2E_API_PORT ?? "5064";
const WEB = process.env.E2E_WEB_PORT ?? "8084";

export default defineConfig({
  testDir: "tests",
  workers: 1, // specs share one database
  retries: 0, // rule R5: a pass that needs a retry is red
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: `http://localhost:${WEB}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone-375", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    {
      command:
        `bash setup-db.sh && cd "${BACKEND}" && POSTGRES_HOST=localhost POSTGRES_USER=postgres POSTGRES_PW= ` +
        `POSTGRES_DB=${PREFIX}_e2e FLASK_ENV=development LLM_API_KEY= MAIL_PASSWORD= GCS_UPLOADS_BUCKET=parity-bucket ` +
        `.venv/bin/flask --app padel_league run --port ${API}`,
      url: `http://127.0.0.1:${API}/api/v1/players/ranking`,
      env: { BACKEND, TEST_DB_PREFIX: PREFIX },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npx vite --config e2e/vite.e2e.config.mts`,
      cwd: path.resolve(__dirname, ".."),
      url: `http://localhost:${WEB}`,
      env: { E2E_API_PORT: API, E2E_WEB_PORT: WEB },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
