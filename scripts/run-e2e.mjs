#!/usr/bin/env node
// Boots the Express e2e server with NODE_V8_COVERAGE pointed at
// coverage/raw/server-e2e/, waits for it to come up, runs Playwright, and
// then propagates SIGTERM so V8 flushes the server-side coverage dump.
//
// One script, two callers (local `npm run verify` and CI) — no second copy.
//
// Side-effects:
//   - mkdir -p coverage/raw/server-e2e
//   - mkdir -p ${E2E_DATA_DIR:-/tmp/clubsoft-e2e}/media
//   - spawns `node server.mjs` on PORT 4322 with DB_PATH/MEDIA_ROOT pointed at
//     a writable temp dir (does not touch production-shaped paths).

import { spawn, spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { runE2eServer } from "./e2e-server-lifecycle.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const PORT = process.env.E2E_PORT ?? "4322";
const E2E_DATA_DIR = process.env.E2E_DATA_DIR ?? "/tmp/clubsoft-e2e";
const dumpDir = resolve(repoRoot, "coverage", "raw", "server-e2e");
const dataDir = resolve(E2E_DATA_DIR);

// Reset the e2e data dir each run so admin seeding is deterministic and we
// don't carry state across runs.
if (existsSync(dataDir)) {
  rmSync(dataDir, { recursive: true, force: true });
}
mkdirSync(resolve(dataDir, "media"), { recursive: true });

// Wipe the previous dump dir so we don't merge stale V8 data.
if (existsSync(dumpDir)) {
  rmSync(dumpDir, { recursive: true, force: true });
}
mkdirSync(dumpDir, { recursive: true });

// Build the SPA if dist/index.html is missing — the server expects it to
// exist for the SPA fallback.
const distIndex = resolve(repoRoot, "dist", "index.html");
if (!existsSync(distIndex) && process.env.E2E_SKIP_BUILD !== "1") {
  console.log("[run-e2e] dist/index.html missing — running vite build...");
  const build = spawnSync("npx", ["vite", "build"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (build.status !== 0) {
    console.error(`[run-e2e] vite build failed (${build.status})`);
    process.exit(build.status ?? 1);
  }
}

const baseUrl = `http://localhost:${PORT}`;

// Optional admin seeding. Runs only when both PLAYWRIGHT_ADMIN_EMAIL and
// PLAYWRIGHT_ADMIN_PASSWORD are set. The admin-login spec test.skip()s when
// they're missing, so an unseeded run is also valid.
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD;
if (adminEmail && adminPassword) {
  const seedResult = spawnSync(
    "node",
    [resolve(repoRoot, "server", "seed-admin.mjs"), adminEmail, adminPassword],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        DB_PATH: resolve(dataDir, "app.db"),
        MEDIA_ROOT: resolve(dataDir, "media"),
      },
    },
  );
  if (seedResult.status !== 0) {
    console.error(`[run-e2e] admin seed failed (${seedResult.status})`);
    process.exit(seedResult.status ?? 1);
  }
}

async function waitForReady() {
  const deadline = Date.now() + 30_000;
  let lastErr = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        // Accept any status — even a 401 means the server is up.
        signal: AbortSignal.timeout(2_000),
      });
      if (res.status >= 200 && res.status < 500) return;
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(
    `e2e server never came up at ${baseUrl}: ${lastErr?.message ?? "timeout"}`,
  );
}

async function runPlaywright() {
  return new Promise((resolvePromise, rejectPromise) => {
    const args = ["playwright", "test"];
    // Forward extra CLI flags after `--` to playwright.
    const extra = process.argv.slice(2);
    args.push(...extra);
    const child = spawn("npx", args, {
      cwd: repoRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        E2E_BASE_URL: baseUrl,
      },
    });
    child.once("exit", (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`playwright exited ${code}`));
    });
    child.once("error", rejectPromise);
  });
}

const result = await runE2eServer({
  command: "node",
  args: [resolve(repoRoot, "server.mjs")],
  env: {
    PORT,
    DB_PATH: resolve(dataDir, "app.db"),
    MEDIA_ROOT: resolve(dataDir, "media"),
    // Disable IG fetch in tests by leaving token unset / placeholder.
    IG_ACCESS_TOKEN: "placeholder",
  },
  dumpDir,
  timeoutMs: 5_000,
  readyTimeoutMs: 30_000,
  waitForReady,
  task: runPlaywright,
});

if (result.exitCode !== 0) {
  console.error(`[run-e2e] failed: ${result.error ?? "(no message)"}`);
}
process.exit(result.exitCode);
