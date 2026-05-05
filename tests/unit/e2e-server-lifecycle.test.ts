import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventEmitter } from "node:events";
// @ts-expect-error - .mjs has no types
import { runE2eServer } from "../../scripts/e2e-server-lifecycle.mjs";

// Fake child process — emits 'exit' on demand. Records signal it was sent.
class FakeChild extends EventEmitter {
  killed: NodeJS.Signals | null = null;
  pid = 9999;
  kill(signal: NodeJS.Signals = "SIGTERM") {
    this.killed = signal;
    return true;
  }
}

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "e2e-life-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("runE2eServer", () => {
  it("exits 0 when child writes a coverage dump on SIGTERM", async () => {
    const dumpDir = join(tmp, "dump");
    mkdirSync(dumpDir, { recursive: true });

    const child = new FakeChild();

    const promise = runE2eServer({
      command: "node",
      args: ["server.mjs"],
      env: {},
      dumpDir,
      timeoutMs: 1000,
      readyTimeoutMs: 1000,
      // Inject the spawn so we control the child lifecycle.
      spawn: () => child as any,
      // Skip the readiness wait — the test isn't about it here.
      waitForReady: async () => {},
      // The "task" the wrapper runs after the server is ready.
      task: async () => {
        // Simulate the e2e workload completing.
        return { ok: true };
      },
    });

    // After the task resolves, the wrapper sends SIGTERM. We simulate the
    // child writing the dump file then exiting.
    setTimeout(() => {
      writeFileSync(join(dumpDir, "coverage-abc.json"), "{}");
      child.emit("exit", 0, null);
    }, 20);

    const result = await promise;
    expect(result.exitCode).toBe(0);
    expect(child.killed).toBe("SIGTERM");
  });

  it("exits non-zero when child never writes a dump file before timeout", async () => {
    const dumpDir = join(tmp, "dump");
    mkdirSync(dumpDir, { recursive: true });

    const child = new FakeChild();

    const promise = runE2eServer({
      command: "node",
      args: ["server.mjs"],
      env: {},
      dumpDir,
      timeoutMs: 100,
      readyTimeoutMs: 1000,
      spawn: () => child as any,
      waitForReady: async () => {},
      task: async () => ({ ok: true }),
    });

    // Child exits cleanly but never wrote a dump.
    setTimeout(() => {
      child.emit("exit", 0, null);
    }, 10);

    const result = await promise;
    expect(result.exitCode).not.toBe(0);
    expect(result.error).toMatch(/dump/i);
  });

  it("surfaces failure (non-zero exit) when child is SIGKILL'd externally", async () => {
    const dumpDir = join(tmp, "dump");
    mkdirSync(dumpDir, { recursive: true });

    const child = new FakeChild();

    const promise = runE2eServer({
      command: "node",
      args: ["server.mjs"],
      env: {},
      dumpDir,
      timeoutMs: 1000,
      readyTimeoutMs: 1000,
      spawn: () => child as any,
      waitForReady: async () => {},
      task: async () => ({ ok: true }),
    });

    // Simulate external SIGKILL: child exits with null exit code, signal SIGKILL.
    setTimeout(() => {
      child.emit("exit", null, "SIGKILL");
    }, 10);

    const result = await promise;
    expect(result.exitCode).not.toBe(0);
    expect(result.error).toMatch(/sigkill|signal/i);
  });

  it("propagates the task's failure as a non-zero exit", async () => {
    const dumpDir = join(tmp, "dump");
    mkdirSync(dumpDir, { recursive: true });

    const child = new FakeChild();

    const promise = runE2eServer({
      command: "node",
      args: ["server.mjs"],
      env: {},
      dumpDir,
      timeoutMs: 1000,
      readyTimeoutMs: 1000,
      spawn: () => child as any,
      waitForReady: async () => {},
      task: async () => {
        throw new Error("playwright failed");
      },
    });

    // Child cooperates: writes dump and exits cleanly so we know the wrapper
    // still tears down the server even on task failure.
    setTimeout(() => {
      writeFileSync(join(dumpDir, "coverage-xyz.json"), "{}");
      child.emit("exit", 0, null);
    }, 20);

    const result = await promise;
    expect(result.exitCode).not.toBe(0);
    expect(result.error).toMatch(/playwright failed/);
    // Server was still SIGTERM'd to flush coverage.
    expect(child.killed).toBe("SIGTERM");
  });

  it("fails clearly when the server never becomes ready", async () => {
    const dumpDir = join(tmp, "dump");
    mkdirSync(dumpDir, { recursive: true });

    const child = new FakeChild();

    const promise = runE2eServer({
      command: "node",
      args: ["server.mjs"],
      env: {},
      dumpDir,
      timeoutMs: 1000,
      readyTimeoutMs: 50,
      spawn: () => child as any,
      // waitForReady throws → server never came up
      waitForReady: async () => {
        throw new Error("readiness probe timed out");
      },
      task: async () => ({ ok: true }),
    });

    // Server child still gets SIGTERM after the readiness failure.
    setTimeout(() => {
      child.emit("exit", 0, null);
    }, 20);

    const result = await promise;
    expect(result.exitCode).not.toBe(0);
    expect(result.error).toMatch(/readi|ready/i);
  });

  it("creates the dump dir if it doesn't exist", async () => {
    const dumpDir = join(tmp, "missing-dir", "dump");
    expect(existsSync(dumpDir)).toBe(false);

    const child = new FakeChild();

    const promise = runE2eServer({
      command: "node",
      args: ["server.mjs"],
      env: {},
      dumpDir,
      timeoutMs: 1000,
      readyTimeoutMs: 1000,
      spawn: () => child as any,
      waitForReady: async () => {},
      task: async () => ({ ok: true }),
    });

    setTimeout(() => {
      writeFileSync(join(dumpDir, "coverage-1.json"), "{}");
      child.emit("exit", 0, null);
    }, 20);

    const result = await promise;
    expect(result.exitCode).toBe(0);
    expect(existsSync(dumpDir)).toBe(true);
  });

  it("passes NODE_V8_COVERAGE in the child env equal to dumpDir", async () => {
    const dumpDir = join(tmp, "dump");
    mkdirSync(dumpDir, { recursive: true });

    const child = new FakeChild();
    let observedEnv: NodeJS.ProcessEnv | undefined;

    const promise = runE2eServer({
      command: "node",
      args: ["server.mjs"],
      env: { FOO: "bar" },
      dumpDir,
      timeoutMs: 1000,
      readyTimeoutMs: 1000,
      spawn: (_cmd, _args, opts) => {
        observedEnv = opts?.env as NodeJS.ProcessEnv | undefined;
        return child as any;
      },
      waitForReady: async () => {},
      task: async () => ({ ok: true }),
    });

    setTimeout(() => {
      writeFileSync(join(dumpDir, "coverage-1.json"), "{}");
      child.emit("exit", 0, null);
    }, 20);

    await promise;
    expect(observedEnv?.NODE_V8_COVERAGE).toBe(dumpDir);
    expect(observedEnv?.FOO).toBe("bar");
  });

  it("returns exitCode=2 with a clear error when dumpDir is missing", async () => {
    const result = await runE2eServer({
      command: "node",
      args: [],
      env: {},
      // @ts-expect-error — exercising the validation branch
      dumpDir: undefined,
      task: async () => ({}),
    });
    expect(result.exitCode).toBe(2);
    expect(result.error).toMatch(/dumpDir/);
  });

  it("returns exitCode=2 with a clear error when task is not a function", async () => {
    const dumpDir = join(tmp, "dump");
    const result = await runE2eServer({
      command: "node",
      args: [],
      env: {},
      dumpDir,
      // @ts-expect-error — exercising the validation branch
      task: undefined,
    });
    expect(result.exitCode).toBe(2);
    expect(result.error).toMatch(/task/);
  });

  it("ignores child.kill() throwing when the child has already gone away", async () => {
    const dumpDir = join(tmp, "dump");
    mkdirSync(dumpDir, { recursive: true });

    const child = new FakeChild();
    child.kill = () => {
      throw new Error("ESRCH: already dead");
    };

    const promise = runE2eServer({
      command: "node",
      args: ["server.mjs"],
      env: {},
      dumpDir,
      timeoutMs: 1000,
      readyTimeoutMs: 1000,
      spawn: () => child as any,
      waitForReady: async () => {},
      task: async () => ({ ok: true }),
    });

    setTimeout(() => {
      writeFileSync(join(dumpDir, "coverage-1.json"), "{}");
      child.emit("exit", 0, null);
    }, 20);

    const result = await promise;
    expect(result.exitCode).toBe(0);
  });

  it("uses the default no-op waitForReady when none is provided", async () => {
    const dumpDir = join(tmp, "dump");
    mkdirSync(dumpDir, { recursive: true });
    const child = new FakeChild();
    const promise = runE2eServer({
      command: "node",
      args: ["server.mjs"],
      env: {},
      dumpDir,
      timeoutMs: 1000,
      readyTimeoutMs: 1000,
      spawn: () => child as any,
      // waitForReady intentionally omitted — defaultWaitForReady should
      // resolve immediately so the task runs.
      task: async () => ({ ok: true }),
    });
    setTimeout(() => {
      writeFileSync(join(dumpDir, "coverage-1.json"), "{}");
      child.emit("exit", 0, null);
    }, 20);
    const result = await promise;
    expect(result.exitCode).toBe(0);
  });

  it("propagates a non-zero child exit code as the wrapper's exitCode", async () => {
    const dumpDir = join(tmp, "dump");
    mkdirSync(dumpDir, { recursive: true });

    const child = new FakeChild();
    const promise = runE2eServer({
      command: "node",
      args: ["server.mjs"],
      env: {},
      dumpDir,
      timeoutMs: 1000,
      readyTimeoutMs: 1000,
      spawn: () => child as any,
      waitForReady: async () => {},
      task: async () => ({ ok: true }),
    });

    setTimeout(() => {
      writeFileSync(join(dumpDir, "coverage-1.json"), "{}");
      child.emit("exit", 17, null);
    }, 20);

    const result = await promise;
    expect(result.exitCode).toBe(17);
    expect(result.error).toMatch(/code 17/);
  });
});
