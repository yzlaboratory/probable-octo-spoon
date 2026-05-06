#!/usr/bin/env node
// CLI wrapper around buildPrComment: reads current/baseline summary JSON files
// and prints the markdown comment to stdout. Used by the CI workflow that
// posts the delta on the PR.
//
// Usage:
//   node scripts/coverage-pr-comment-cli.mjs --current=<path> [--baseline=<path>]
//
// If --baseline is omitted or the file is missing, the comment renders the
// "no baseline available" informational notice.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildPrComment } from "./coverage-pr-comment.mjs";

export function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (a.startsWith("--current=")) out.current = a.slice("--current=".length);
    else if (a.startsWith("--baseline="))
      out.baseline = a.slice("--baseline=".length);
  }
  return out;
}

export function readJsonOrNull(path, { read = readFileSync, exists = existsSync } = {}) {
  if (!path) return null;
  if (!exists(path)) return null;
  try {
    return JSON.parse(read(path, "utf8"));
  } catch {
    return null;
  }
}

// Drop synthetic "total" entry — same convention as runVerify.
export function stripTotal(s) {
  if (!s) return s;
  const { total, ...rest } = s;
  return rest;
}

export function runCli({ argv, stdout, stderr, deps = {} } = {}) {
  const args = parseArgs(argv);
  if (!args.current) {
    stderr.write(
      "usage: coverage-pr-comment-cli.mjs --current=<path> [--baseline=<path>]\n",
    );
    return 2;
  }
  const current = readJsonOrNull(args.current, deps);
  if (current == null) {
    stderr.write(`[coverage-pr-comment] missing or unreadable: ${args.current}\n`);
    return 2;
  }
  const baseline = readJsonOrNull(args.baseline, deps);
  stdout.write(
    buildPrComment({
      current: stripTotal(current),
      baseline: stripTotal(baseline),
    }) + "\n",
  );
  return 0;
}

// Only auto-run when invoked as a script (so tests can import without side effects).
if (import.meta.url === `file://${process.argv[1]}` ||
    fileURLToPath(import.meta.url) === process.argv[1]) {
  const code = runCli({
    argv: process.argv.slice(2),
    stdout: process.stdout,
    stderr: process.stderr,
  });
  process.exit(code);
}
