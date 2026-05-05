import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error - .mjs has no types
import {
  readBaseline,
  writeBaseline,
  resetBaseline,
} from "../../scripts/coverage-baseline.mjs";

let dir: string;
let cachePath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "coverage-baseline-"));
  cachePath = join(dir, "last-good-coverage.json");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("readBaseline", () => {
  it("returns null when the cache file does not exist", () => {
    expect(readBaseline(cachePath)).toBeNull();
  });

  it("returns null when the cache file is corrupt", () => {
    writeFileSync(cachePath, "{ not json");
    expect(readBaseline(cachePath)).toBeNull();
  });
});

describe("writeBaseline + readBaseline round-trip", () => {
  it("writes data that read returns verbatim", () => {
    const data = {
      "src/foo.ts": {
        lines: { pct: 80 },
        branches: { pct: 70 },
        functions: { pct: 90 },
      },
      "src/bar.ts": {
        lines: { pct: 100 },
        branches: { pct: 100 },
        functions: { pct: 100 },
      },
    };
    writeBaseline(cachePath, data);
    expect(readBaseline(cachePath)).toEqual(data);
  });

  it("creates the parent directory if it does not exist", () => {
    const nested = join(dir, "nested", "deeper", "cache.json");
    writeBaseline(nested, { hello: "world" });
    expect(readBaseline(nested)).toEqual({ hello: "world" });
  });
});

describe("writeBaseline atomicity", () => {
  it("never leaves a half-written file at the destination path (uses rename)", () => {
    // Write succeeds: only the final file should exist at the cache path.
    // No tmp file should remain at cachePath after the operation.
    const data = { foo: "bar" };
    writeBaseline(cachePath, data);
    expect(existsSync(cachePath)).toBe(true);
    // Tmp files share the destination dir but with a different name; the
    // final path itself is always either absent or fully-formed JSON.
    const parsed = JSON.parse(readFileSync(cachePath, "utf8"));
    expect(parsed).toEqual(data);
    // No leftover .tmp files for this path
    const leftovers = readdirSync(dir).filter(
      (n) => n.startsWith("last-good-coverage.json.") && n.endsWith(".tmp"),
    );
    expect(leftovers).toEqual([]);
  });
});

describe("resetBaseline", () => {
  it("deletes the cache file when it exists", () => {
    writeBaseline(cachePath, { x: 1 });
    expect(existsSync(cachePath)).toBe(true);
    resetBaseline(cachePath);
    expect(existsSync(cachePath)).toBe(false);
    expect(readBaseline(cachePath)).toBeNull();
  });

  it("is a no-op when the cache file does not exist", () => {
    expect(() => resetBaseline(cachePath)).not.toThrow();
  });
});
