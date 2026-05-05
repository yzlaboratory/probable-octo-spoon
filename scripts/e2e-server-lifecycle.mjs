// E2E server lifecycle wrapper.
//
// Boots an inner process (typically `node server.mjs`) with NODE_V8_COVERAGE
// pointed at a per-run dump dir, runs a user-supplied async `task`, then
// propagates SIGTERM to the child and waits for V8 to flush its coverage dump
// into the dir before exiting. Designed to be the single boot mechanism shared
// by both local `npm run verify` and CI — no second copy.
//
// Pure-ish: I/O surface is minimal (mkdir, readdir poll, spawn). All
// time-and-process side effects are injectable via `spawn`, `waitForReady`,
// `task`, and `now` so the unit tests can stub them.

import { spawn as defaultSpawn } from "node:child_process";
import { mkdirSync, readdirSync, existsSync } from "node:fs";

/**
 * @param {object} opts
 * @param {string} opts.command         Argv[0] for the child process.
 * @param {string[]} opts.args          Argv tail.
 * @param {NodeJS.ProcessEnv} opts.env  Extra env merged with the wrapper's own. NODE_V8_COVERAGE is forced to dumpDir.
 * @param {string} opts.dumpDir         Directory the child writes its V8 coverage dump into.
 * @param {number} opts.timeoutMs       How long to wait for a dump file to appear after SIGTERM.
 * @param {number} opts.readyTimeoutMs  How long to wait for the readiness probe.
 * @param {(cmd: string, args: string[], opts: object) => any} [opts.spawn]    Injectable child spawner.
 * @param {() => Promise<void>} [opts.waitForReady]                            Injectable readiness probe.
 * @param {() => Promise<unknown>} opts.task                                   The work to run while the server is up.
 * @returns {Promise<{ exitCode: number, error?: string }>}
 */
export async function runE2eServer(opts) {
  const {
    command,
    args,
    env = {},
    dumpDir,
    timeoutMs = 5000,
    readyTimeoutMs = 30000,
    spawn = defaultSpawn,
    waitForReady = defaultWaitForReady,
    task,
  } = opts;

  if (!dumpDir) {
    return { exitCode: 2, error: "dumpDir is required" };
  }
  if (typeof task !== "function") {
    return { exitCode: 2, error: "task is required" };
  }

  // V8 only writes a dump if the directory exists.
  mkdirSync(dumpDir, { recursive: true });

  const childEnv = {
    ...process.env,
    ...env,
    NODE_V8_COVERAGE: dumpDir,
  };

  const child = spawn(command, args, {
    env: childEnv,
    stdio: ["ignore", "inherit", "inherit"],
  });

  // Track child exit so we can synthesise it into the wait-for-dump phase.
  let childExited = false;
  let exitCode = null;
  let exitSignal = null;
  const childExit = new Promise((resolve) => {
    child.once("exit", (code, signal) => {
      childExited = true;
      exitCode = code;
      exitSignal = signal;
      resolve({ code, signal });
    });
  });

  // 1. Readiness — give up early if the server doesn't come up.
  let readyError = null;
  try {
    await Promise.race([
      waitForReady(),
      sleep(readyTimeoutMs).then(() => {
        throw new Error(`server never became ready within ${readyTimeoutMs}ms`);
      }),
    ]);
  } catch (err) {
    readyError = err instanceof Error ? err.message : String(err);
  }

  // 2. Run the task only if the server actually came up.
  let taskError = null;
  if (!readyError) {
    try {
      await task();
    } catch (err) {
      taskError = err instanceof Error ? err.message : String(err);
    }
  }

  // 3. Always SIGTERM the child so V8 flushes coverage.
  if (!childExited) {
    try {
      child.kill("SIGTERM");
    } catch {
      // Already dead. Ignore.
    }
  }

  // 4. Wait for child to exit.
  const childResult = await childExit;

  // 5. If child was killed externally (SIGKILL), V8 won't have flushed.
  //    Surface that as the failure mode regardless of dump-dir state.
  let signalError = null;
  if (childResult.signal && childResult.signal !== "SIGTERM") {
    signalError = `server child terminated by signal ${childResult.signal}`;
  }

  // 6. Wait (poll) for at least one coverage-*.json dump file to appear.
  let dumpError = null;
  if (!signalError) {
    const found = await waitForDump(dumpDir, timeoutMs);
    if (!found) {
      dumpError = `no V8 coverage dump appeared in ${dumpDir} within ${timeoutMs}ms`;
    }
  }

  // 7. Compose the most informative error.
  const error = readyError || taskError || signalError || dumpError;
  if (error) {
    return { exitCode: 1, error };
  }

  // 8. Honour an unclean child exit code even on the happy dump path.
  if (typeof childResult.code === "number" && childResult.code !== 0) {
    return {
      exitCode: childResult.code,
      error: `server child exited with code ${childResult.code}`,
    };
  }

  return { exitCode: 0 };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForDump(dir, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(dir)) {
      const entries = readdirSync(dir);
      if (entries.some((f) => /^coverage-.+\.json$/.test(f))) {
        return true;
      }
    }
    await sleep(25);
  }
  return false;
}

// Default readiness probe is a no-op; callers must provide one for real use.
async function defaultWaitForReady() {
  // Intentionally empty. Real callers pass a function that polls the server's
  // liveness URL or stdout banner.
}
