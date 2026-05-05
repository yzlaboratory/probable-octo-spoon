import { describe, it, expect } from "vitest";
// @ts-expect-error — .mjs with no types
import { buildPrComment } from "../../scripts/coverage-pr-comment.mjs";

describe("buildPrComment", () => {
  it("returns a 'no changes' comment when current and baseline match", () => {
    const summary = {
      "src/foo.ts": { lines: { pct: 80 } },
      "src/bar.ts": { lines: { pct: 90 } },
    };
    const out = buildPrComment({ current: summary, baseline: summary });
    expect(out).toContain("Coverage");
    expect(out).toMatch(/no per-file changes/i);
  });

  it("lists regressed files in a 'Regressed' section", () => {
    const baseline = {
      "src/a.ts": { lines: { pct: 90 } },
      "src/b.ts": { lines: { pct: 80 } },
    };
    const current = {
      "src/a.ts": { lines: { pct: 85 } },
      "src/b.ts": { lines: { pct: 80 } },
    };
    const out = buildPrComment({ current, baseline });
    expect(out).toMatch(/Regressed \(1\)/);
    expect(out).toContain("src/a.ts");
    expect(out).toContain("90.00%");
    expect(out).toContain("85.00%");
    expect(out).toContain("-5.00%");
    expect(out).not.toMatch(/Improved/);
  });

  it("lists improved files in an 'Improved' section", () => {
    const baseline = { "src/a.ts": { lines: { pct: 60 } } };
    const current = { "src/a.ts": { lines: { pct: 90 } } };
    const out = buildPrComment({ current, baseline });
    expect(out).toMatch(/Improved \(1\)/);
    expect(out).toContain("+30.00%");
    expect(out).not.toMatch(/Regressed/);
  });

  it("includes both sections when there are regressions and improvements", () => {
    const baseline = {
      "src/a.ts": { lines: { pct: 90 } },
      "src/b.ts": { lines: { pct: 60 } },
    };
    const current = {
      "src/a.ts": { lines: { pct: 80 } },
      "src/b.ts": { lines: { pct: 70 } },
    };
    const out = buildPrComment({ current, baseline });
    expect(out).toMatch(/Regressed \(1\)/);
    expect(out).toMatch(/Improved \(1\)/);
  });

  it("ignores files that are new (not in baseline) — they have no delta to report", () => {
    const baseline = { "src/a.ts": { lines: { pct: 80 } } };
    const current = {
      "src/a.ts": { lines: { pct: 80 } },
      "src/new.ts": { lines: { pct: 50 } },
    };
    const out = buildPrComment({ current, baseline });
    expect(out).not.toContain("src/new.ts");
    expect(out).toMatch(/no per-file changes/i);
  });

  it("ignores files that disappeared from current", () => {
    const baseline = {
      "src/a.ts": { lines: { pct: 80 } },
      "src/gone.ts": { lines: { pct: 100 } },
    };
    const current = { "src/a.ts": { lines: { pct: 80 } } };
    const out = buildPrComment({ current, baseline });
    expect(out).not.toContain("src/gone.ts");
    expect(out).toMatch(/no per-file changes/i);
  });

  it("renders an informational notice when baseline is null (first run)", () => {
    const current = { "src/a.ts": { lines: { pct: 80 } } };
    const out = buildPrComment({ current, baseline: null });
    expect(out).toMatch(/no baseline available/i);
  });

  it("renders an informational notice when baseline is empty {}", () => {
    const current = { "src/a.ts": { lines: { pct: 80 } } };
    const out = buildPrComment({ current, baseline: {} });
    expect(out).toMatch(/no baseline available/i);
  });

  it("sorts regressions worst-first (most negative delta on top)", () => {
    const baseline = {
      "src/a.ts": { lines: { pct: 100 } },
      "src/b.ts": { lines: { pct: 100 } },
    };
    const current = {
      "src/a.ts": { lines: { pct: 99 } },
      "src/b.ts": { lines: { pct: 50 } },
    };
    const out = buildPrComment({ current, baseline });
    const aIdx = out.indexOf("src/a.ts");
    const bIdx = out.indexOf("src/b.ts");
    expect(bIdx).toBeGreaterThan(-1);
    expect(aIdx).toBeGreaterThan(bIdx);
  });

  it("sorts improvements best-first (largest gain on top)", () => {
    const baseline = {
      "src/a.ts": { lines: { pct: 50 } },
      "src/b.ts": { lines: { pct: 90 } },
    };
    const current = {
      "src/a.ts": { lines: { pct: 99 } },
      "src/b.ts": { lines: { pct: 91 } },
    };
    const out = buildPrComment({ current, baseline });
    const aIdx = out.indexOf("src/a.ts");
    const bIdx = out.indexOf("src/b.ts");
    expect(aIdx).toBeGreaterThan(-1);
    expect(bIdx).toBeGreaterThan(aIdx);
  });
});
