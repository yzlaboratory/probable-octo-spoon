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
});
