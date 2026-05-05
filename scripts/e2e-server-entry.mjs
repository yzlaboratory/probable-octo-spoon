#!/usr/bin/env node
// Entry shim for the e2e Express server. Imports server.mjs so it boots
// normally, then installs a SIGTERM handler that calls v8.takeCoverage()
// to force-flush the V8 coverage dump and exits 0 so NODE_V8_COVERAGE's
// atexit hook also writes its dump file.
//
// Why a shim and not a SIGTERM handler in server.mjs?
// server.mjs is production code; we don't want test-only lifecycle hooks
// living there. The shim is dev-only and lives next to the e2e wrapper.

import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import v8 from "node:v8";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function shutdown() {
  try {
    // Synchronously snapshot coverage to NODE_V8_COVERAGE dir, even if
    // the atexit hook on signal exit is unreliable.
    if (typeof v8.takeCoverage === "function") {
      v8.takeCoverage();
    }
  } catch (err) {
    console.error("[e2e-server-entry] v8.takeCoverage failed:", err);
  }
  // Exit 0 so the wrapper sees a clean shutdown and so NODE_V8_COVERAGE's
  // own atexit dump runs.
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Boot the real server. Importing has the side effect of app.listen().
await import(resolve(repoRoot, "server.mjs"));
