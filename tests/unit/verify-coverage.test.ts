import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
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
});
