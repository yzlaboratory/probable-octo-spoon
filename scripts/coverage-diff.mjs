// Pure coverage diff comparator. No I/O.
//
// Inputs:
//   current  — coverage-summary.json shape: { [filePath]: { lines: { pct }, branches: { pct }, functions: { pct } } }
//   baseline — same shape (or null/empty for first run)
//   threshold — non-negative number; a per-file lines.pct drop strictly greater than this counts as a regression
//
// Output: { regressions: Array<{ file, metric, baseline, current, delta }>, exitCode: 0|1, informational: boolean }

export function diffCoverage({ current, baseline, threshold = 0 }) {
  const informational = baseline == null || Object.keys(baseline).length === 0;
  const regressions = [];
  if (!informational) {
    for (const file of Object.keys(current ?? {})) {
      const cur = current[file]?.lines?.pct;
      const base = baseline[file]?.lines?.pct;
      if (typeof cur !== "number" || typeof base !== "number") continue;
      const delta = cur - base;
      if (delta < 0 && Math.abs(delta) > threshold) {
        regressions.push({ file, metric: "lines", baseline: base, current: cur, delta });
      }
    }
  }
  return { regressions, exitCode: regressions.length === 0 ? 0 : 1, informational };
}
