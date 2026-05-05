// Pure PR-comment builder for coverage deltas. No I/O.
//
// Inputs:
//   current  — coverage-summary.json shape: { [filePath]: { lines: { pct } } }
//   baseline — same shape (or null/empty for first run)
//
// Output: a markdown string suitable for posting as a PR comment. Lists files
// whose lines.pct improved or regressed vs the baseline. The diff comparator
// (scripts/coverage-diff.mjs) remains the regression gate; this module only
// renders human-readable signal for the PR conversation.

const HEADER = "## Coverage";

function pctOrUndef(s, file) {
  return s?.[file]?.lines?.pct;
}

export function buildPrComment({ current, baseline }) {
  const lines = [HEADER, ""];

  if (baseline == null || Object.keys(baseline).length === 0) {
    lines.push(
      "_No baseline available (first run on this branch). This run captured the initial baseline._",
    );
    return lines.join("\n");
  }

  const cur = current ?? {};
  const base = baseline ?? {};
  const files = new Set([...Object.keys(cur), ...Object.keys(base)]);

  const improved = [];
  const regressed = [];
  for (const file of files) {
    const c = pctOrUndef(cur, file);
    const b = pctOrUndef(base, file);
    if (typeof c !== "number" || typeof b !== "number") continue;
    const delta = c - b;
    if (delta > 0) improved.push({ file, baseline: b, current: c, delta });
    else if (delta < 0) regressed.push({ file, baseline: b, current: c, delta });
  }

  if (improved.length === 0 && regressed.length === 0) {
    lines.push("_No per-file changes in `lines.pct` vs `main`._");
    return lines.join("\n");
  }

  const fmt = (n) => n.toFixed(2);

  if (regressed.length > 0) {
    lines.push(`### Regressed (${regressed.length})`, "");
    lines.push("| File | Baseline | Current | Delta |");
    lines.push("| --- | ---: | ---: | ---: |");
    for (const r of regressed.sort((a, b) => a.delta - b.delta)) {
      lines.push(
        `| \`${r.file}\` | ${fmt(r.baseline)}% | ${fmt(r.current)}% | ${fmt(r.delta)}% |`,
      );
    }
    lines.push("");
  }

  if (improved.length > 0) {
    lines.push(`### Improved (${improved.length})`, "");
    lines.push("| File | Baseline | Current | Delta |");
    lines.push("| --- | ---: | ---: | ---: |");
    for (const r of improved.sort((a, b) => b.delta - a.delta)) {
      lines.push(
        `| \`${r.file}\` | ${fmt(r.baseline)}% | ${fmt(r.current)}% | +${fmt(r.delta)}% |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
