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
import { buildPrComment } from "./coverage-pr-comment.mjs";

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (a.startsWith("--current=")) out.current = a.slice("--current=".length);
    else if (a.startsWith("--baseline="))
      out.baseline = a.slice("--baseline=".length);
  }
  return out;
}

function readJsonOrNull(path) {
  if (!path) return null;
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

const args = parseArgs(process.argv.slice(2));
if (!args.current) {
  console.error(
    "usage: coverage-pr-comment-cli.mjs --current=<path> [--baseline=<path>]",
  );
  process.exit(2);
}

const current = readJsonOrNull(args.current);
if (current == null) {
  console.error(`[coverage-pr-comment] missing or unreadable: ${args.current}`);
  process.exit(2);
}
const baseline = readJsonOrNull(args.baseline);

// Drop synthetic "total" entry — same convention as runVerify.
function stripTotal(s) {
  if (!s) return s;
  const { total, ...rest } = s;
  return rest;
}

process.stdout.write(
  buildPrComment({
    current: stripTotal(current),
    baseline: stripTotal(baseline),
  }) + "\n",
);
