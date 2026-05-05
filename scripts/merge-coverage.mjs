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

import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { CoverageReport } from "monocart-coverage-reports";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const rawRoot = resolve(repoRoot, "coverage", "raw");
const outputDir = resolve(repoRoot, "coverage", "report");

// Two ingestion paths:
//   - Monocart-formatted raw (Vitest + Playwright via monocart-reporter): keys
//     include `id`, `type`, `data`. Loaded via the constructor's `inputDir`.
//   - Node.js NODE_V8_COVERAGE raw (the e2e Express server dump): keys are
//     `{ result: [...] }`. Loaded via `addFromDir(dir)` so Monocart hydrates
//     each entry with its source text before merging.
function classifyRawDir(dir) {
  let files;
  try {
    files = readdirSync(dir).filter((f) => /^coverage-.+\.json$/.test(f));
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  try {
    const sample = JSON.parse(readFileSync(resolve(dir, files[0]), "utf8"));
    if (Array.isArray(sample?.result)) return "node-v8";
    return "monocart-raw";
  } catch {
    return null;
  }
}

function discoverRawSources(root) {
  if (!existsSync(root)) return { monocart: [], nodeV8: [] };
  const monocart = [];
  const nodeV8 = [];
  // Walk up to two levels deep — monocart-reporter writes its raw under
  // <outputDir>/raw/ when configured with `reports: [['raw']]`, so the path
  // ends up like coverage/raw/playwright/raw/.
  const walk = (dir, depth) => {
    let st;
    try {
      st = statSync(dir);
    } catch {
      return;
    }
    if (!st.isDirectory()) return;
    const kind = classifyRawDir(dir);
    if (kind === "monocart-raw") {
      monocart.push(dir);
      return;
    }
    if (kind === "node-v8") {
      nodeV8.push(dir);
      return;
    }
    if (depth <= 0) return;
    for (const entry of readdirSync(dir)) {
      walk(resolve(dir, entry), depth - 1);
    }
  };
  for (const entry of readdirSync(root)) {
    walk(resolve(root, entry), 2);
  }
  return { monocart, nodeV8 };
}

const sources = discoverRawSources(rawRoot);
const inputDir = sources.monocart;
const nodeV8Dirs = sources.nodeV8;
if (inputDir.length === 0 && nodeV8Dirs.length === 0) {
  console.error(
    `[merge-coverage] no raw V8 coverage subdirs found under ${rawRoot}`,
  );
  console.error(
    "[merge-coverage] expected coverage/raw/{vitest,playwright,server-e2e}/coverage-*.json",
  );
  process.exit(2);
}

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
    // Drop CSS bundles surfaced by Chromium's CSSCoverage (Tailwind output is
    // not actionable in the unified coverage signal). JS bundles stay in so
    // their sourcemaps unpack into src/ entries; they're then removed by
    // Monocart automatically.
    if (/\.css(\?.*)?$/.test(url)) return false;
    return true;
  },
  sourceFilter: (sourcePath) => {
    if (!sourcePath) return false;
    if (sourcePath.includes("node_modules/")) return false;
    if (sourcePath.includes("/dist/")) return false;
    if (sourcePath.includes("/coverage/")) return false;
    // CSS surfaced from Chromium's CSSCoverage isn't useful for the unified
    // signal — it's mostly Tailwind output and bundle-level concatenations.
    if (/\.css(\?.*)?$/.test(sourcePath)) return false;
    // Static assets imported by JS (svg, png, etc.) get registered as
    // sourcemap entries by Vite. They have no executable code to cover.
    if (
      /\.(svg|png|jpe?g|gif|webp|ico|avif|woff2?|ttf|otf|eot|json)$/.test(
        sourcePath,
      )
    ) {
      return false;
    }
    // Bundle-named entries (e.g. localhost-4322/assets/index-*.js or
    // assets/index-*.css) that didn't unpack into a real source path. Match
    // both URL-style and stripped variants since Monocart rewrites path
    // shapes during sourcemap unpacking.
    if (/(^|\/)localhost[-:.]?\d*\//.test(sourcePath)) return false;
    if (/(^|\/)assets\/[^/]+\.(m?js|css)$/.test(sourcePath)) return false;
    if (/\.test\.[tj]sx?$|\.test\.mjs$/.test(sourcePath)) return false;
    // Only first-party source files.
    return /(^|\/)(src|server|scripts|infrastructure)\//.test(sourcePath);
  },
  sourcePath: (filePath) => normaliseSourcePath(filePath),
  cleanCache: true,
  clean: true,
};

const allDirs = [...inputDir, ...nodeV8Dirs];
console.log(
  `[merge-coverage] merging ${allDirs.length} source(s):\n  - ${allDirs
    .map(
      (p) =>
        `${relative(repoRoot, p)} (${
          inputDir.includes(p) ? "monocart-raw" : "node-v8"
        })`,
    )
    .join("\n  - ")}`,
);

const report = new CoverageReport(coverageOptions);
// Pull in NODE_V8_COVERAGE-style dirs first (Monocart hydrates source text
// from the file:// URLs in the raw dump). The constructor's `inputDir`
// already handles the monocart-raw subdirs declared above.
for (const dir of nodeV8Dirs) {
  await report.addFromDir(dir);
}
const result = await report.generate();

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
