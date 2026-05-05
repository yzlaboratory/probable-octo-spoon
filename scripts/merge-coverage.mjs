#!/usr/bin/env node
// Coverage merge orchestrator. Wraps monocart-coverage-reports' multi-source
// `inputDir` API. Auto-discovers any subdirectory of coverage/raw/ that
// contains coverage-*.json V8 dump files and folds them into one report.
//
// Inputs (auto-discovered):
//   coverage/raw/vitest/        — vitest-monocart-coverage provider output (PR 1+)
//   coverage/raw/vitest-node/   — future: when issue 02 splits projects
//   coverage/raw/vitest-browser/— future: when issue 02 splits projects
//   coverage/raw/playwright/    — monocart-reporter output (this PR)
//   coverage/raw/server-e2e/    — NODE_V8_COVERAGE dump from the e2e Express server (this PR)
//
// Outputs:
//   coverage/report/index.html  — merged human report
//   coverage/coverage-summary.json — merged JSON summary (overwrites the
//     Vitest-only summary so the diff comparator sees the unified picture).
//
// `sourcePath` normalisation collapses absolute paths and any
// `file:///` URLs from the Node.js V8 dumps into repo-relative paths so the
// same source file isn't double-counted under different paths across sources.

import { readdirSync, statSync, existsSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CoverageReport } from "monocart-coverage-reports";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const rawRoot = resolve(repoRoot, "coverage", "raw");
const outputDir = resolve(repoRoot, "coverage", "report");

function discoverRawSources(root) {
  if (!existsSync(root)) return [];
  const sources = [];
  for (const entry of readdirSync(root)) {
    const abs = resolve(root, entry);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    const files = readdirSync(abs);
    if (files.some((f) => /^coverage-.+\.json$/.test(f))) {
      sources.push(abs);
    }
  }
  return sources;
}

const inputDir = discoverRawSources(rawRoot);
if (inputDir.length === 0) {
  console.error(
    `[merge-coverage] no raw V8 coverage subdirs found under ${rawRoot}`,
  );
  console.error(
    "[merge-coverage] expected coverage/raw/{vitest,playwright,server-e2e}/coverage-*.json",
  );
  process.exit(2);
}

const repoRootUrl = pathToFileURL(repoRoot + "/").href;

function normaliseSourcePath(filePath) {
  if (!filePath) return filePath;
  // Strip any file:// URL prefix.
  let p = filePath;
  if (p.startsWith("file://")) {
    try {
      p = fileURLToPath(p);
    } catch {
      // Keep as-is if it isn't a valid URL.
    }
  }
  // Collapse absolute repo paths to repo-relative form.
  if (p.startsWith(repoRoot + "/")) {
    p = relative(repoRoot, p);
  }
  // Drop the worktree segment so the same source file under a worktree and
  // under the main checkout collapses to one path. Worktrees live under
  // .claude/worktrees/<id>/ — strip up to that prefix.
  const worktreeMatch = p.match(/\.claude\/worktrees\/[^/]+\/(.*)$/);
  if (worktreeMatch) p = worktreeMatch[1];
  return p;
}

const coverageOptions = {
  name: "Clubsoft unified coverage",
  inputDir,
  outputDir,
  baseDir: repoRoot,
  reports: [
    // Human-readable HTML.
    "v8",
    // Machine-readable summary written into the merged report dir.
    "json-summary",
    // Console line for quick scan in CI logs.
    "console-summary",
  ],
  entryFilter: (entry) => {
    if (!entry?.url) return false;
    const url = entry.url;
    if (url.includes("/node_modules/")) return false;
    if (url.includes("/dist/")) return false;
    if (url.includes("/coverage/")) return false;
    if (/\.test\.[tj]sx?$|\.test\.mjs$/.test(url)) return false;
    return true;
  },
  sourceFilter: (sourcePath) => {
    if (!sourcePath) return false;
    if (sourcePath.includes("/node_modules/")) return false;
    if (sourcePath.includes("/dist/")) return false;
    if (sourcePath.includes("/coverage/")) return false;
    if (/\.test\.[tj]sx?$|\.test\.mjs$/.test(sourcePath)) return false;
    return /(^|\/)(src|server|scripts)\//.test(sourcePath);
  },
  sourcePath: (filePath) => normaliseSourcePath(filePath),
  cleanCache: true,
  clean: true,
};

console.log(
  `[merge-coverage] merging ${inputDir.length} source(s):\n  - ${inputDir
    .map((p) => relative(repoRoot, p))
    .join("\n  - ")}`,
);

const result = await new CoverageReport(coverageOptions).generate();

// Mirror the merged json-summary up to coverage/coverage-summary.json so the
// existing diff comparator (scripts/coverage-diff.mjs) sees the unified
// signal without changes.
const mergedSummary = resolve(outputDir, "coverage-summary.json");
const topSummary = resolve(repoRoot, "coverage", "coverage-summary.json");
if (existsSync(mergedSummary)) {
  const { copyFileSync } = await import("node:fs");
  copyFileSync(mergedSummary, topSummary);
  console.log(
    `[merge-coverage] merged summary copied to ${relative(repoRoot, topSummary)}`,
  );
}

console.log(
  `[merge-coverage] report at ${relative(repoRoot, result?.reportPath ?? outputDir)}`,
);
