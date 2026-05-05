import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error - .mjs has no types
import { runVerify } from "../../scripts/verify-coverage.mjs";

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
