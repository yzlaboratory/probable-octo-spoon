import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

// Path to the CLI script in this worktree.
const cli = resolve(__dirname, "../../scripts/coverage-pr-comment-cli.mjs");

let dir: string;
let currentPath: string;
let baselinePath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pr-comment-cli-"));
  currentPath = join(dir, "current.json");
  baselinePath = join(dir, "baseline.json");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function run(args: string[]) {
  return spawnSync("node", [cli, ...args], { encoding: "utf8" });
}

describe("coverage-pr-comment-cli", () => {
  it("prints a 'no per-file changes' comment for identical summaries", () => {
    const summary = { "src/foo.ts": { lines: { pct: 80 } } };
    writeFileSync(currentPath, JSON.stringify(summary));
    writeFileSync(baselinePath, JSON.stringify(summary));
    const r = run([`--current=${currentPath}`, `--baseline=${baselinePath}`]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Coverage");
    expect(r.stdout).toMatch(/no per-file changes/i);
  });

  it("renders a regression delta when current dropped vs baseline", () => {
    writeFileSync(
      currentPath,
      JSON.stringify({ "src/foo.ts": { lines: { pct: 70 } } }),
    );
    writeFileSync(
      baselinePath,
      JSON.stringify({ "src/foo.ts": { lines: { pct: 90 } } }),
    );
    const r = run([`--current=${currentPath}`, `--baseline=${baselinePath}`]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Regressed \(1\)/);
    expect(r.stdout).toContain("src/foo.ts");
    expect(r.stdout).toContain("-20.00%");
  });

  it("renders the informational notice when --baseline is omitted", () => {
    writeFileSync(
      currentPath,
      JSON.stringify({ "src/foo.ts": { lines: { pct: 80 } } }),
    );
    const r = run([`--current=${currentPath}`]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/no baseline available/i);
  });

  it("renders the informational notice when --baseline file is missing on disk", () => {
    writeFileSync(
      currentPath,
      JSON.stringify({ "src/foo.ts": { lines: { pct: 80 } } }),
    );
    const r = run([
      `--current=${currentPath}`,
      `--baseline=${join(dir, "does-not-exist.json")}`,
    ]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/no baseline available/i);
  });

  it("ignores the synthetic 'total' entry in current and baseline", () => {
    writeFileSync(
      currentPath,
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
    const r = run([`--current=${currentPath}`, `--baseline=${baselinePath}`]);
    expect(r.status).toBe(0);
    expect(r.stdout).not.toContain("total");
    expect(r.stdout).toMatch(/no per-file changes/i);
  });

  it("exits non-zero with a usage message when --current is missing", () => {
    const r = run([]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("usage:");
  });

  it("exits non-zero when --current points at a missing file", () => {
    const r = run([`--current=${join(dir, "nope.json")}`]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("missing");
  });
});
