import { describe, it, expect } from "vitest";
// @ts-expect-error - .mjs with no types
import { diffCoverage } from "../../scripts/coverage-diff.mjs";

describe("diffCoverage", () => {
  it("returns no regressions when summaries are identical", () => {
    const summary = {
      "src/foo.ts": {
        lines: { pct: 80 },
        branches: { pct: 70 },
        functions: { pct: 90 },
      },
    };
    const result = diffCoverage({
      current: summary,
      baseline: summary,
      threshold: 0,
    });
    expect(result.regressions).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it("flags a file whose lines.pct dropped at threshold 0", () => {
    const baseline = {
      "src/foo.ts": {
        lines: { pct: 80 },
        branches: { pct: 70 },
        functions: { pct: 90 },
      },
    };
    const current = {
      "src/foo.ts": {
        lines: { pct: 75 },
        branches: { pct: 70 },
        functions: { pct: 90 },
      },
    };
    const result = diffCoverage({ current, baseline, threshold: 0 });
    expect(result.regressions).toHaveLength(1);
    expect(result.regressions[0]).toMatchObject({
      file: "src/foo.ts",
      metric: "lines",
      baseline: 80,
      current: 75,
      delta: -5,
    });
    expect(result.exitCode).toBe(1);
  });

  it("treats a 4% drop as no regression when threshold is 5%", () => {
    const baseline = { "src/foo.ts": { lines: { pct: 80 } } };
    const current = { "src/foo.ts": { lines: { pct: 76 } } };
    const result = diffCoverage({ current, baseline, threshold: 5 });
    expect(result.regressions).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it("flags any drop when threshold is 0", () => {
    const baseline = { "src/foo.ts": { lines: { pct: 80 } } };
    const current = { "src/foo.ts": { lines: { pct: 79.99 } } };
    const result = diffCoverage({ current, baseline, threshold: 0 });
    expect(result.regressions).toHaveLength(1);
    expect(result.exitCode).toBe(1);
  });

  it("treats an empty/missing baseline as informational (no regression)", () => {
    const current = { "src/foo.ts": { lines: { pct: 80 } } };
    const result = diffCoverage({ current, baseline: null, threshold: 0 });
    expect(result.regressions).toEqual([]);
    expect(result.exitCode).toBe(0);
    expect(result.informational).toBe(true);
  });

  it("does not flag files that are new (not in baseline)", () => {
    const baseline = { "src/foo.ts": { lines: { pct: 80 } } };
    const current = {
      "src/foo.ts": { lines: { pct: 80 } },
      "src/new.ts": { lines: { pct: 50 } },
    };
    const result = diffCoverage({ current, baseline, threshold: 0 });
    expect(result.regressions).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it("does not flag improvements", () => {
    const baseline = { "src/foo.ts": { lines: { pct: 60 } } };
    const current = { "src/foo.ts": { lines: { pct: 90 } } };
    const result = diffCoverage({ current, baseline, threshold: 0 });
    expect(result.regressions).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it("flags multiple regressions across files", () => {
    const baseline = {
      "src/a.ts": { lines: { pct: 80 } },
      "src/b.ts": { lines: { pct: 90 } },
      "src/c.ts": { lines: { pct: 100 } },
    };
    const current = {
      "src/a.ts": { lines: { pct: 70 } },
      "src/b.ts": { lines: { pct: 85 } },
      "src/c.ts": { lines: { pct: 100 } },
    };
    const result = diffCoverage({ current, baseline, threshold: 0 });
    expect(result.regressions.map((r) => r.file).sort()).toEqual([
      "src/a.ts",
      "src/b.ts",
    ]);
    expect(result.exitCode).toBe(1);
  });
});
