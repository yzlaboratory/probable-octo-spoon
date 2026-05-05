#!/usr/bin/env node
// Coverage merge orchestrator. Two-stage pipeline:
//
//   Stage 1 — monocart-coverage-reports converts the V8 raw dumps from
//   Playwright + the e2e Express server into Istanbul JSON via its `json` and
//   `json-summary` reporters. Sourcemaps unpack the bundled JS back to the
//   original .ts/.tsx/.mjs files.
//
//   Stage 2 — istanbul-lib-coverage merges that intermediate Istanbul JSON
//   with the Istanbul JSON written by `@vitest/coverage-v8` (which covers the
//   node + browser Vitest projects together). The combined map is summarised
//   into the final coverage-summary.json that scripts/verify-coverage.mjs
//   consumes.
//
// Why the two-stage shape: monocart's V8 converter throws when istanbul data
// is mixed into the same generate() call as raw V8 inputs (CssAst path
// crashes on entries with missing ranges; the istanbul/V8 unification has a
// real bug). Doing the V8→Istanbul conversion first, then merging at the
// Istanbul level, sidesteps the bug entirely and uses the standard
// istanbul-lib-coverage merge that nyc and friends rely on.
//
// Inputs (auto-discovered):
//   coverage/coverage-final.json — Istanbul output from @vitest/coverage-v8
//                                  (covers node + browser Vitest projects)
//   coverage/raw/playwright/    — monocart-reporter raw V8 (browser bundle)
//   coverage/raw/server-e2e/    — NODE_V8_COVERAGE dump from the e2e server
//
// Outputs:
//   coverage/report/index.html      — monocart's V8 HTML report (e2e only)
//   coverage/report/coverage-final.json — istanbul JSON for the e2e tier
//   coverage/coverage-final.json     — final merged Istanbul (vitest + e2e)
//   coverage/coverage-summary.json   — final merged summary (verify reads this)

import {
  readdirSync,
  statSync,
  existsSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { CoverageReport } from "monocart-coverage-reports";
import libCoverage from "istanbul-lib-coverage";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const rawRoot = resolve(repoRoot, "coverage", "raw");
const e2eOutputDir = resolve(repoRoot, "coverage", "report");

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

function normaliseSourcePath(filePath) {
  if (!filePath) return filePath;
  let p = filePath;
  if (p.startsWith("file://")) {
    try {
      p = fileURLToPath(p);
    } catch {
      // Keep as-is if not a valid URL.
    }
  }
  if (p.startsWith(repoRoot + "/")) {
    p = relative(repoRoot, p);
  }
  // Drop the worktree segment so the same source under a worktree and the
  // main checkout collapses to one path.
  const worktreeMatch = p.match(/\.claude\/worktrees\/[^/]+\/(.*)$/);
  if (worktreeMatch) p = worktreeMatch[1];
  return p;
}

const sources = discoverRawSources(rawRoot);
const monocartDirs = sources.monocart;
const nodeV8Dirs = sources.nodeV8;

const vitestIstanbulPath = resolve(repoRoot, "coverage", "coverage-final.json");
const hasVitestIstanbul = existsSync(vitestIstanbulPath);

if (
  monocartDirs.length === 0 &&
  nodeV8Dirs.length === 0 &&
  !hasVitestIstanbul
) {
  console.error(
    `[merge-coverage] no coverage inputs found under ${rawRoot} or coverage-final.json`,
  );
  console.error(
    "[merge-coverage] expected coverage/coverage-final.json (vitest) and/or coverage/raw/{playwright,server-e2e}/coverage-*.json",
  );
  process.exit(2);
}

// ────────────────────────────────────────────────────────────────────────
// Stage 1: V8 raw → Istanbul JSON via monocart.
// ────────────────────────────────────────────────────────────────────────

const sourceLines = [];
for (const p of monocartDirs)
  sourceLines.push(`${relative(repoRoot, p)} (monocart-raw)`);
for (const p of nodeV8Dirs)
  sourceLines.push(`${relative(repoRoot, p)} (node-v8)`);
if (hasVitestIstanbul)
  sourceLines.push(
    `${relative(repoRoot, vitestIstanbulPath)} (vitest-istanbul)`,
  );
console.log(
  `[merge-coverage] merging ${sourceLines.length} source(s):\n  - ${sourceLines.join("\n  - ")}`,
);

let e2eIstanbulPath = null;
if (monocartDirs.length > 0 || nodeV8Dirs.length > 0) {
  const e2eOptions = {
    name: "Clubsoft e2e coverage",
    inputDir: monocartDirs,
    outputDir: e2eOutputDir,
    baseDir: repoRoot,
    reports: [
      // Human-readable HTML drill-down (V8 reporter).
      "v8",
      // Per-file Istanbul JSON — this is what we feed into stage 2.
      "json",
      // Per-file summary JSON — convenient for spot-checks.
      "json-summary",
      "console-summary",
    ],
    entryFilter: (entry) => {
      if (!entry?.url) return false;
      const url = entry.url;
      if (url.includes("/node_modules/")) return false;
      if (url.includes("/dist/")) return false;
      if (url.includes("/coverage/")) return false;
      if (/\.test\.[tj]sx?$|\.test\.mjs$/.test(url)) return false;
      if (/\.css(\?.*)?$/.test(url)) return false;
      return true;
    },
    sourceFilter: (sourcePath) => {
      if (!sourcePath) return false;
      if (sourcePath.includes("node_modules/")) return false;
      if (sourcePath.includes("/dist/")) return false;
      if (sourcePath.includes("/coverage/")) return false;
      if (/\.css(\?.*)?$/.test(sourcePath)) return false;
      if (
        /\.(svg|png|jpe?g|gif|webp|ico|avif|woff2?|ttf|otf|eot|json)$/.test(
          sourcePath,
        )
      )
        return false;
      if (/(^|\/)localhost[-:.]?\d*\//.test(sourcePath)) return false;
      if (/(^|\/)assets\/[^/]+\.(m?js|css)$/.test(sourcePath)) return false;
      if (/\.test\.[tj]sx?$|\.test\.mjs$/.test(sourcePath)) return false;
      return /(^|\/)(src|server|scripts|infrastructure)\//.test(sourcePath);
    },
    sourcePath: (filePath) => normaliseSourcePath(filePath),
    cleanCache: true,
    clean: true,
  };

  const report = new CoverageReport(e2eOptions);
  for (const dir of nodeV8Dirs) {
    await report.addFromDir(dir);
  }
  await report.generate();
  e2eIstanbulPath = resolve(e2eOutputDir, "coverage-final.json");
}

// ────────────────────────────────────────────────────────────────────────
// Stage 2: Istanbul-level merge.
// ────────────────────────────────────────────────────────────────────────

function loadIstanbul(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function rekeyToRepoRelative(istanbulData) {
  // Vitest writes absolute paths as keys ("/Users/.../src/Foo.tsx"); monocart
  // already writes repo-relative keys. Normalise everything to repo-relative
  // so merge keys collide for the same source file.
  const out = {};
  for (const [k, v] of Object.entries(istanbulData)) {
    const rel = normaliseSourcePath(k);
    const fileCov = { ...v, path: rel };
    out[rel] = fileCov;
  }
  return out;
}

const finalMap = libCoverage.createCoverageMap({});
const vitestData = loadIstanbul(vitestIstanbulPath);
const e2eData = loadIstanbul(e2eIstanbulPath);
if (vitestData) finalMap.merge(rekeyToRepoRelative(vitestData));
if (e2eData) finalMap.merge(rekeyToRepoRelative(e2eData));

// Write the merged Istanbul JSON + summary.
const finalIstanbulPath = resolve(repoRoot, "coverage", "coverage-final.json");
const finalSummaryPath = resolve(repoRoot, "coverage", "coverage-summary.json");

writeFileSync(finalIstanbulPath, JSON.stringify(finalMap.toJSON()));

const summary = { total: finalMap.getCoverageSummary().toJSON() };
for (const [path, fc] of Object.entries(finalMap.data)) {
  summary[path] = fc.toSummary().toJSON();
}
writeFileSync(finalSummaryPath, JSON.stringify(summary));

const t = summary.total;
console.log(
  `[merge-coverage] merged: lines ${t.lines.pct}% | statements ${t.statements.pct}% | functions ${t.functions.pct}% | branches ${t.branches.pct}%`,
);
console.log(
  `[merge-coverage] summary at ${relative(repoRoot, finalSummaryPath)}`,
);
if (e2eIstanbulPath) {
  console.log(
    `[merge-coverage] e2e HTML report at ${relative(repoRoot, e2eOutputDir)}/index.html`,
  );
}
