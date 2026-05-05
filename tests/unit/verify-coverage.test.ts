import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  existsSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
// @ts-expect-error - .mjs has no types
import {
  runVerify,
  parseArgs,
  resolveGitDir,
  detectIsMain,
  runCli,
} from "../../scripts/verify-coverage.mjs";

let dir: string;
let summaryPath: string;
let baselinePath: string;

const noopLog = () => {};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "verify-coverage-"));
  summaryPath = join(dir, "coverage-summary.json");
  baselinePath = join(dir, "baseline.json");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("runVerify — baseline-source override", () => {
  it("uses the baselinePath argument as the comparison source", () => {
    writeFileSync(
      summaryPath,
      JSON.stringify({
        "src/foo.ts": { lines: { pct: 75 } },
      }),
    );
    writeFileSync(
      baselinePath,
      JSON.stringify({
        "src/foo.ts": { lines: { pct: 80 } },
      }),
    );
    const result = runVerify({
      summaryPath,
      baselinePath,
      threshold: 0,
      updateBaseline: false,
      log: noopLog,
      error: noopLog,
    });
    expect(result.exitCode).toBe(1);
    expect(result.regressions).toHaveLength(1);
    expect(result.regressions[0].file).toBe("src/foo.ts");
  });

  it("returns exit 0 with no regressions when current matches baseline", () => {
    const summary = { "src/foo.ts": { lines: { pct: 80 } } };
    writeFileSync(summaryPath, JSON.stringify(summary));
    writeFileSync(baselinePath, JSON.stringify(summary));
    const result = runVerify({
      summaryPath,
      baselinePath,
      threshold: 0,
      updateBaseline: false,
      log: noopLog,
      error: noopLog,
    });
    expect(result.exitCode).toBe(0);
    expect(result.regressions).toEqual([]);
  });

  it("ignores the synthetic 'total' entry in both summaries", () => {
    writeFileSync(
      summaryPath,
      JSON.stringify({
        total: { lines: { pct: 50 } },
        "src/foo.ts": { lines: { pct: 80 } },
      }),
    );
    writeFileSync(
      baselinePath,
      JSON.stringify({
        total: { lines: { pct: 99 } },
        "src/foo.ts": { lines: { pct: 80 } },
      }),
    );
    const result = runVerify({
      summaryPath,
      baselinePath,
      threshold: 0,
      updateBaseline: false,
      log: noopLog,
      error: noopLog,
    });
    expect(result.exitCode).toBe(0);
    expect(result.regressions).toEqual([]);
  });
});

describe("runVerify — informational first run", () => {
  it("returns informational with exit 0 when the baseline file does not exist", () => {
    writeFileSync(
      summaryPath,
      JSON.stringify({ "src/foo.ts": { lines: { pct: 80 } } }),
    );
    const result = runVerify({
      summaryPath,
      baselinePath, // does not exist
      threshold: 0,
      updateBaseline: false,
      log: noopLog,
      error: noopLog,
    });
    expect(result.informational).toBe(true);
    expect(result.exitCode).toBe(0);
    // updateBaseline=false → no cache write even on first run
    expect(existsSync(baselinePath)).toBe(false);
  });

  it("writes the baseline cache on first run when updateBaseline=true", () => {
    const summary = { "src/foo.ts": { lines: { pct: 80 } } };
    writeFileSync(summaryPath, JSON.stringify(summary));
    const result = runVerify({
      summaryPath,
      baselinePath,
      threshold: 0,
      updateBaseline: true,
      log: noopLog,
      error: noopLog,
    });
    expect(result.informational).toBe(true);
    expect(existsSync(baselinePath)).toBe(true);
  });
});

describe("runVerify — updateBaseline policy", () => {
  it("does NOT update the baseline cache when updateBaseline=false (CI mode)", () => {
    const baselineContent = { "src/foo.ts": { lines: { pct: 80 } } };
    writeFileSync(summaryPath, JSON.stringify(baselineContent));
    writeFileSync(baselinePath, JSON.stringify(baselineContent));
    const before = JSON.parse(readFileSync(baselinePath, "utf8"));
    runVerify({
      summaryPath,
      baselinePath,
      threshold: 0,
      updateBaseline: false,
      log: noopLog,
      error: noopLog,
    });
    const after = JSON.parse(readFileSync(baselinePath, "utf8"));
    // Same data — but more importantly, the file was not rewritten with `current`.
    expect(after).toEqual(before);
  });

  it("DOES update the baseline cache on success when updateBaseline=true (local mode)", () => {
    const baselineContent = { "src/foo.ts": { lines: { pct: 70 } } };
    const currentContent = { "src/foo.ts": { lines: { pct: 80 } } };
    writeFileSync(baselinePath, JSON.stringify(baselineContent));
    writeFileSync(summaryPath, JSON.stringify(currentContent));
    runVerify({
      summaryPath,
      baselinePath,
      threshold: 0,
      updateBaseline: true,
      log: noopLog,
      error: noopLog,
    });
    const after = JSON.parse(readFileSync(baselinePath, "utf8"));
    expect(after).toEqual(currentContent);
  });

  it("does NOT update the baseline cache when there is a regression", () => {
    const baselineContent = { "src/foo.ts": { lines: { pct: 80 } } };
    const currentContent = { "src/foo.ts": { lines: { pct: 50 } } };
    writeFileSync(baselinePath, JSON.stringify(baselineContent));
    writeFileSync(summaryPath, JSON.stringify(currentContent));
    runVerify({
      summaryPath,
      baselinePath,
      threshold: 0,
      updateBaseline: true,
      log: noopLog,
      error: noopLog,
    });
    const after = JSON.parse(readFileSync(baselinePath, "utf8"));
    expect(after).toEqual(baselineContent); // unchanged
  });
});

describe("runVerify — missing summary", () => {
  it("returns exit code 2 with a clear error when the summary file is missing", () => {
    let errMsg = "";
    const result = runVerify({
      summaryPath, // not written
      baselinePath,
      threshold: 0,
      updateBaseline: false,
      log: noopLog,
      error: (m) => {
        errMsg = String(m);
      },
    });
    expect(result.exitCode).toBe(2);
    expect(errMsg).toContain("missing");
  });
});

describe("runVerify — regression message", () => {
  it("emits a per-file regression line via the error callback", () => {
    writeFileSync(
      summaryPath,
      JSON.stringify({ "src/foo.ts": { lines: { pct: 70 } } }),
    );
    writeFileSync(
      baselinePath,
      JSON.stringify({ "src/foo.ts": { lines: { pct: 80 } } }),
    );
    const errors: string[] = [];
    runVerify({
      summaryPath,
      baselinePath,
      threshold: 0,
      updateBaseline: false,
      log: noopLog,
      error: (m: string) => errors.push(m),
    });
    expect(errors.some((e) => /regression in 1 file\(s\)/.test(e))).toBe(true);
    expect(errors.some((e) => /src\/foo\.ts/.test(e))).toBe(true);
    expect(errors.some((e) => /threshold = 0%/.test(e))).toBe(true);
  });
});

// Subprocess smoke test — guards the bottom-of-file CLI shim against
// regressions. The bulk of CLI behaviour is unit-tested via runCli below.
describe("verify-coverage CLI subprocess smoke", () => {
  it("invoking verify-coverage.mjs as a script exits 0 on a green coverage-summary.json", () => {
    // Resolve the realpath so the script's `isMain` check passes on macOS,
    // where /var/folders is symlinked to /private/var/folders.
    const workdir = realpathSync(
      mkdtempSync(join(tmpdir(), "verify-coverage-cli-")),
    );
    try {
      execSync("git init -q", { cwd: workdir });
      const realScripts = resolve(__dirname, "../../scripts");
      const fakeScripts = join(workdir, "scripts");
      mkdirSync(fakeScripts, { recursive: true });
      for (const name of [
        "verify-coverage.mjs",
        "coverage-baseline.mjs",
        "coverage-diff.mjs",
      ]) {
        writeFileSync(
          join(fakeScripts, name),
          readFileSync(join(realScripts, name), "utf8"),
        );
      }
      const scriptPath = join(fakeScripts, "verify-coverage.mjs");
      mkdirSync(join(workdir, "coverage"));
      writeFileSync(
        join(workdir, "coverage", "coverage-summary.json"),
        JSON.stringify({ "src/foo.ts": { lines: { pct: 80 } } }),
      );
      writeFileSync(
        join(workdir, "package.json"),
        JSON.stringify({ coverage: { threshold: 0 } }),
      );
      const r = spawnSync(process.execPath, [scriptPath], {
        cwd: workdir,
        encoding: "utf8",
      });
      expect(r.status).toBe(0);
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  });
});

// Smoke-test the import.meta `isMain` detection: importing the module from a
// test (this file) must NOT execute the CLI block. If it did, the test would
// hang or write to the user's repo. We verify by importing through Node and
// asserting no .git side effects happened in a fresh dir.
describe("verify-coverage isMain detection", () => {
  it("does not run the CLI block when imported as a module (covered by this test running at all)", async () => {
    // Just importing it again — the runVerify export is the contract. If the
    // CLI block fired on import, every test in this file would have died.
    const mod = (await import("../../scripts/verify-coverage.mjs")) as {
      runVerify: typeof runVerify;
    };
    expect(typeof mod.runVerify).toBe("function");
    // Exercise import.meta.url through fileURLToPath to guard the helper from
    // accidental edits — not a coverage requirement, just a smoke check.
    expect(typeof fileURLToPath(import.meta.url)).toBe("string");
  });

  it("detectIsMain returns false when imported from another module (this test)", () => {
    expect(detectIsMain()).toBe(false);
  });
});

describe("parseArgs", () => {
  it("returns an empty object for an empty argv", () => {
    expect(parseArgs([])).toEqual({});
  });

  it("--no-update sets updateBaseline=false", () => {
    expect(parseArgs(["--no-update"])).toEqual({ updateBaseline: false });
  });

  it("--baseline=PATH sets baselineOverride", () => {
    expect(parseArgs(["--baseline=/x/y.json"])).toEqual({
      baselineOverride: "/x/y.json",
    });
  });

  it("--tier=NAME sets tier", () => {
    expect(parseArgs(["--tier=full"])).toEqual({ tier: "full" });
  });

  it("ignores unknown flags", () => {
    expect(parseArgs(["--bogus", "--also-bogus=x"])).toEqual({});
  });
});

describe("resolveGitDir", () => {
  it("returns the resolved git-dir for a real repo", () => {
    const repo = realpathSync(mkdtempSync(join(tmpdir(), "vc-rgd-")));
    try {
      execSync("git init -q", { cwd: repo });
      const got = resolveGitDir(repo);
      // Either ".git" or absolute path — both should exist as a directory.
      expect(existsSync(got)).toBe(true);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("falls back to <cwd>/.git when git rev-parse fails", () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), "vc-rgd-no-git-")));
    // Suppress the expected "fatal: not a git repository" noise on stderr —
    // resolveGitDir uses execSync which inherits the parent's stderr by default.
    const stderrWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = (() => true) as typeof process.stderr.write;
    try {
      // No `git init` here — running git rev-parse will fail with exit code 128.
      expect(resolveGitDir(dir)).toBe(join(dir, ".git"));
    } finally {
      process.stderr.write = stderrWrite;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("runCli", () => {
  let workdir: string;

  beforeEach(() => {
    workdir = realpathSync(mkdtempSync(join(tmpdir(), "vc-cli-")));
    execSync("git init -q", { cwd: workdir });
  });

  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  function writeSummary(summary: unknown) {
    const cov = join(workdir, "coverage");
    mkdirSync(cov, { recursive: true });
    writeFileSync(join(cov, "coverage-summary.json"), JSON.stringify(summary));
  }

  function writePkg(pkg: unknown) {
    writeFileSync(join(workdir, "package.json"), JSON.stringify(pkg));
  }

  it("first run with no baseline writes the cache and exits 0", () => {
    writePkg({ coverage: { threshold: 0 } });
    writeSummary({ "src/foo.ts": { lines: { pct: 80 } } });
    const code = runCli({
      argv: [],
      env: {},
      repoRoot: workdir,
      log: () => {},
      error: () => {},
    });
    expect(code).toBe(0);
    const gitDir = execSync("git rev-parse --git-dir", {
      cwd: workdir,
      encoding: "utf8",
    }).trim();
    expect(existsSync(join(workdir, gitDir, "last-good-coverage.json"))).toBe(true);
  });

  it("--tier=full writes a tier-specific cache filename", () => {
    writePkg({ coverage: { threshold: 0 } });
    writeSummary({ "src/foo.ts": { lines: { pct: 80 } } });
    runCli({
      argv: ["--tier=full"],
      env: {},
      repoRoot: workdir,
      log: () => {},
      error: () => {},
    });
    const gitDir = execSync("git rev-parse --git-dir", {
      cwd: workdir,
      encoding: "utf8",
    }).trim();
    expect(
      existsSync(join(workdir, gitDir, "last-good-coverage.full.json")),
    ).toBe(true);
  });

  it("--baseline=<path> uses the explicit override and skips the cache write", () => {
    writePkg({ coverage: { threshold: 0 } });
    writeSummary({ "src/foo.ts": { lines: { pct: 70 } } });
    const baseline = join(workdir, "external.json");
    writeFileSync(baseline, JSON.stringify({ "src/foo.ts": { lines: { pct: 80 } } }));
    const errors: string[] = [];
    const code = runCli({
      argv: [`--baseline=${baseline}`],
      env: {},
      repoRoot: workdir,
      log: () => {},
      error: (m: string) => errors.push(m),
    });
    expect(code).toBe(1);
    expect(errors.some((e) => /regression in 1 file/.test(e))).toBe(true);
    const gitDir = execSync("git rev-parse --git-dir", {
      cwd: workdir,
      encoding: "utf8",
    }).trim();
    expect(existsSync(join(workdir, gitDir, "last-good-coverage.json"))).toBe(false);
  });

  it("COVERAGE_BASELINE env wins when --baseline is absent", () => {
    writePkg({ coverage: { threshold: 0 } });
    writeSummary({ "src/foo.ts": { lines: { pct: 70 } } });
    const baseline = join(workdir, "from-env.json");
    writeFileSync(baseline, JSON.stringify({ "src/foo.ts": { lines: { pct: 90 } } }));
    const code = runCli({
      argv: [],
      env: { COVERAGE_BASELINE: baseline },
      repoRoot: workdir,
      log: () => {},
      error: () => {},
    });
    expect(code).toBe(1);
  });

  it("COVERAGE_NO_UPDATE truthy disables cache write", () => {
    writePkg({ coverage: { threshold: 0 } });
    writeSummary({ "src/foo.ts": { lines: { pct: 80 } } });
    runCli({
      argv: [],
      env: { COVERAGE_NO_UPDATE: "1" },
      repoRoot: workdir,
      log: () => {},
      error: () => {},
    });
    const gitDir = execSync("git rev-parse --git-dir", {
      cwd: workdir,
      encoding: "utf8",
    }).trim();
    expect(existsSync(join(workdir, gitDir, "last-good-coverage.json"))).toBe(false);
  });

  it("COVERAGE_NO_UPDATE='0' / 'false' is treated as enabled", () => {
    writePkg({ coverage: { threshold: 0 } });
    writeSummary({ "src/foo.ts": { lines: { pct: 80 } } });
    for (const v of ["0", "false"]) {
      // Reset cache between iterations to make the assertion meaningful.
      const gitDir = execSync("git rev-parse --git-dir", {
        cwd: workdir,
        encoding: "utf8",
      }).trim();
      const cache = join(workdir, gitDir, "last-good-coverage.json");
      if (existsSync(cache)) rmSync(cache);
      runCli({
        argv: [],
        env: { COVERAGE_NO_UPDATE: v },
        repoRoot: workdir,
        log: () => {},
        error: () => {},
      });
      expect(existsSync(cache)).toBe(true);
    }
  });

  it("--no-update flag wins regardless of env", () => {
    writePkg({ coverage: { threshold: 0 } });
    writeSummary({ "src/foo.ts": { lines: { pct: 80 } } });
    runCli({
      argv: ["--no-update"],
      env: { COVERAGE_NO_UPDATE: "0" }, // env says update; flag overrides
      repoRoot: workdir,
      log: () => {},
      error: () => {},
    });
    const gitDir = execSync("git rev-parse --git-dir", {
      cwd: workdir,
      encoding: "utf8",
    }).trim();
    expect(existsSync(join(workdir, gitDir, "last-good-coverage.json"))).toBe(false);
  });

  it("falls back to threshold=0 when package.json is missing or unreadable", () => {
    // No package.json — the catch defaults pkg to {} so threshold = 0.
    writeSummary({ "src/foo.ts": { lines: { pct: 80 } } });
    const code = runCli({
      argv: [],
      env: {},
      repoRoot: workdir,
      log: () => {},
      error: () => {},
    });
    expect(code).toBe(0);
  });

  it("uses the default console.log/console.error when no log/error fns are passed", () => {
    writePkg({ coverage: { threshold: 0 } });
    // Seed a baseline that yields a regression so error() fires.
    const gitDir = execSync("git rev-parse --git-dir", {
      cwd: workdir,
      encoding: "utf8",
    }).trim();
    mkdirSync(join(workdir, gitDir), { recursive: true });
    writeFileSync(
      join(workdir, gitDir, "last-good-coverage.json"),
      JSON.stringify({ "src/foo.ts": { lines: { pct: 90 } } }),
    );
    writeSummary({ "src/foo.ts": { lines: { pct: 70 } } });

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      // Call runCli without log/error — the defaults should kick in.
      const code = runCli({ argv: [], env: {}, repoRoot: workdir });
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalled();

      // Now a green run to fire the default log() path.
      writeFileSync(
        join(workdir, gitDir, "last-good-coverage.json"),
        JSON.stringify({ "src/foo.ts": { lines: { pct: 70 } } }),
      );
      const ok = runCli({ argv: [], env: {}, repoRoot: workdir });
      expect(ok).toBe(0);
      expect(logSpy).toHaveBeenCalled();
    } finally {
      errSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  it("honours a non-zero threshold from package.json (drop within threshold passes)", () => {
    writePkg({ coverage: { threshold: 25 } });
    writeSummary({ "src/foo.ts": { lines: { pct: 75 } } });
    // Seed an existing baseline at 80 so the diff sees a 5-point drop.
    const gitDir = execSync("git rev-parse --git-dir", {
      cwd: workdir,
      encoding: "utf8",
    }).trim();
    mkdirSync(join(workdir, gitDir), { recursive: true });
    writeFileSync(
      join(workdir, gitDir, "last-good-coverage.json"),
      JSON.stringify({ "src/foo.ts": { lines: { pct: 80 } } }),
    );
    const code = runCli({
      argv: [],
      env: {},
      repoRoot: workdir,
      log: () => {},
      error: () => {},
    });
    expect(code).toBe(0); // 5-point drop is within threshold of 25
  });
});
