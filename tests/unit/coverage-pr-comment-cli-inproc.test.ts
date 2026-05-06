import { describe, it, expect } from "vitest";
// @ts-expect-error — sibling .mjs ships no .d.ts.
import {
  parseArgs,
  readJsonOrNull,
  stripTotal,
  runCli,
} from "../../scripts/coverage-pr-comment-cli.mjs";

class Buf {
  chunks: string[] = [];
  write(chunk: string) {
    this.chunks.push(chunk);
    return true;
  }
  get text() {
    return this.chunks.join("");
  }
}

describe("coverage-pr-comment-cli (in-process)", () => {
  describe("parseArgs", () => {
    it("recognises --current and --baseline and ignores unknown flags", () => {
      expect(
        parseArgs(["--current=a.json", "--baseline=b.json", "--debug"]),
      ).toEqual({ current: "a.json", baseline: "b.json" });
    });

    it("returns an empty object when no recognised flags are passed", () => {
      expect(parseArgs([])).toEqual({});
      expect(parseArgs(["foo", "--unknown=1"])).toEqual({});
    });
  });

  describe("readJsonOrNull", () => {
    const stub = (
      files: Record<string, string | (() => string)>,
    ): {
      read: (p: string, enc: string) => string;
      exists: (p: string) => boolean;
    } => ({
      read: (p) => {
        const v = files[p];
        return typeof v === "function" ? v() : v;
      },
      exists: (p) => p in files,
    });

    it("returns null when the path is falsy", () => {
      expect(
        readJsonOrNull(null, stub({})),
      ).toBeNull();
      expect(
        readJsonOrNull("", stub({})),
      ).toBeNull();
    });

    it("returns null when the file does not exist", () => {
      expect(
        readJsonOrNull("missing.json", stub({})),
      ).toBeNull();
    });

    it("returns null when the file content is not valid JSON", () => {
      expect(
        readJsonOrNull("bad.json", stub({ "bad.json": "not json {" })),
      ).toBeNull();
    });

    it("returns the parsed object when the file is valid JSON", () => {
      const got = readJsonOrNull(
        "ok.json",
        stub({ "ok.json": '{"a":1}' }),
      );
      expect(got).toEqual({ a: 1 });
    });
  });

  describe("stripTotal", () => {
    it("returns the input unchanged when null/undefined", () => {
      expect(stripTotal(null)).toBeNull();
      expect(stripTotal(undefined)).toBeUndefined();
    });

    it("removes the synthetic 'total' key while preserving other entries", () => {
      const out = stripTotal({
        total: { lines: { pct: 50 } },
        "src/foo.ts": { lines: { pct: 80 } },
      });
      expect(out).toEqual({ "src/foo.ts": { lines: { pct: 80 } } });
    });
  });

  describe("runCli", () => {
    it("returns 2 and prints usage to stderr when --current is missing", () => {
      const stdout = new Buf();
      const stderr = new Buf();
      const code = runCli({ argv: [], stdout, stderr });
      expect(code).toBe(2);
      expect(stderr.text).toContain("usage:");
      expect(stdout.text).toBe("");
    });

    it("returns 2 with a diagnostic when --current points at an unreadable path", () => {
      const stdout = new Buf();
      const stderr = new Buf();
      const code = runCli({
        argv: ["--current=missing.json"],
        stdout,
        stderr,
        deps: { read: () => "", exists: () => false },
      });
      expect(code).toBe(2);
      expect(stderr.text).toContain("missing or unreadable");
    });

    it("renders the no-baseline notice when only --current is provided", () => {
      const stdout = new Buf();
      const stderr = new Buf();
      const code = runCli({
        argv: ["--current=cur.json"],
        stdout,
        stderr,
        deps: {
          read: (p: string) =>
            p === "cur.json"
              ? JSON.stringify({ "src/foo.ts": { lines: { pct: 80 } } })
              : "",
          exists: (p: string) => p === "cur.json",
        },
      });
      expect(code).toBe(0);
      expect(stdout.text).toMatch(/no baseline available/i);
    });

    it("renders the regression delta when current dropped vs baseline (and strips 'total' from both)", () => {
      const stdout = new Buf();
      const stderr = new Buf();
      const files: Record<string, string> = {
        "cur.json": JSON.stringify({
          total: { lines: { pct: 50 } },
          "src/foo.ts": { lines: { pct: 70 } },
        }),
        "base.json": JSON.stringify({
          total: { lines: { pct: 99 } },
          "src/foo.ts": { lines: { pct: 90 } },
        }),
      };
      const code = runCli({
        argv: ["--current=cur.json", "--baseline=base.json"],
        stdout,
        stderr,
        deps: {
          read: (p: string) => files[p],
          exists: (p: string) => p in files,
        },
      });
      expect(code).toBe(0);
      expect(stdout.text).toContain("src/foo.ts");
      expect(stdout.text).toContain("-20.00%");
      // 'total' entry must not bleed into the rendered comment.
      expect(stdout.text).not.toContain("total");
    });

    it("treats a missing baseline file the same as 'no baseline'", () => {
      const stdout = new Buf();
      const stderr = new Buf();
      const code = runCli({
        argv: ["--current=cur.json", "--baseline=does-not-exist.json"],
        stdout,
        stderr,
        deps: {
          read: (p: string) =>
            p === "cur.json"
              ? JSON.stringify({ "src/foo.ts": { lines: { pct: 80 } } })
              : "",
          exists: (p: string) => p === "cur.json",
        },
      });
      expect(code).toBe(0);
      expect(stdout.text).toMatch(/no baseline available/i);
    });
  });
});
