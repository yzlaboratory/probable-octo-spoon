# ADR 0015 — Local coverage gates for agent loops

- **Status:** Accepted
- **Date:** 2026-05-04
- **Deciders:** Yannik Zeyer.
- **Supersedes:** none
- **Superseded by:** none
- **Related:** ADR 0014 (the coverage architecture this ADR gates against).

## Context

ADR 0014 establishes a unified V8 coverage signal across server, components, and e2e flows, with CI as the diff-against-`main` authoritative gate. That signal closes the *measurement* gap. It does not close the *timing* gap.

The timing gap is observable in the current agent workflow: an AI agent (Claude Code or similar) makes changes locally, runs unit tests, commits atomically, pushes to a PR — and then the agent's loop ends. CI runs *after* the push, asynchronously. If CI fails (a coverage regression, an integration test break, an e2e flake-or-real-failure), the agent has already stopped; the user has to re-engage the agent later, paste the failure, and reload context. The cost of that round-trip — and the silent class of regressions that get merged because nobody re-engages — is exactly what ADR 0014 was meant to prevent.

The current `CLAUDE.md` convention reinforces the problem: atomic commits, push without asking. Pushes are frequent. Each push is a moment where the agent's loop could end before CI feedback returns.

The fix has to land *inside the agent's execution window*. That means local gates that block the push (or block the agent's "task done" claim) until the same checks CI would run have passed, or at least the cheap subset of them.

## Decision

1. **Two local gates, tiered by speed:**
   - A **pre-push Husky hook** that runs the fast subset (Vitest projects only) on every `git push`.
   - An **`npm run verify` script** that runs the full pipeline (Vitest + Playwright + merged Monocart report + baseline diff) and is required to be green before an agent declares a code-touching task complete.
2. **Pre-push hook scope.**
   - Runs `vitest run --coverage` across the `node` and `browser` projects (per ADR 0014).
   - Emits `coverage-summary.json` to a deterministic path under `coverage/`.
   - Diffs against `.git/last-good-coverage.json` (locally cached baseline). Any file's `lines.pct` dropping below the cached value fails the hook.
   - Target wall time: **under 90 seconds**. If it exceeds 120 s consistently after the migration completes, revisit the heuristic-skip option (P3 in the design discussion) as a fallback.
   - First push from a fresh clone or new branch with no cache: informational only, no gate. Cache populates on successful push.
3. **`npm run verify` script scope.**
   - Runs everything CI runs for the coverage gate: Vitest both projects, Playwright e2e (with `NODE_V8_COVERAGE` on the Express e2e server per ADR 0014), Monocart multi-source merge, full diff against the locally cached baseline.
   - Returns non-zero on regression.
   - Target wall time: **under 5 minutes**.
   - There is also `npm run verify:fast`, which is the same checks the pre-push hook performs — useful for mid-task spot-checks.
4. **Agent contract.** `CLAUDE.md` is amended in the *Implementation Conventions* section: *"Run `npm run verify` and confirm a green exit before declaring any code-touching task complete."* The agent runs it once at end-of-task, not per commit.
5. **Baseline cache mechanics.**
   - File: `.git/last-good-coverage.json`. In `.git/` so it is branch-aware-ish and never committed to source. No `.gitignore` entry needed.
   - Updated by the pre-push hook on successful run (after the diff passes) — i.e. the *last successful* push's summary becomes the next push's baseline.
   - To reset (e.g. if the cache becomes stale or wrong): delete the file. Next push is informational; the one after re-establishes the cache.
   - **CI remains authoritative.** The CI gate diffs against `main`'s most recent green coverage artifact. The local cache is a fast proxy that reduces in-loop surprises; it is not the source of truth. Where the two disagree, CI wins.
6. **Hook bypass.** `--no-verify` is reserved for explicit user authorisation per the global `CLAUDE.md` rule (*"NEVER skip hooks unless the user has explicitly asked for it"*). The agent does not bypass. Humans rarely should.
7. **No pre-commit coverage gate.** Coverage runs only at push, not per commit. Pre-commit remains reserved for fast linting/formatting/type-checking (out of scope for this ADR; addressed by the existing `setup-pre-commit` workflow if used).
8. **Enforcement is social, not mechanical.** There is no out-of-band way to intercept an agent's "task done" claim. The contract is encoded in `CLAUDE.md` text the agent reads, and `npm run verify`'s exit code is the truth-value the agent must check. CI is the backstop for the case where this convention slips.

## Alternatives considered

- **P1 — Heavy pre-push: full pipeline (Vitest + Playwright + merged report) on every push.** Rejected: 2–4 minutes per push, multiplied by ~5–8 pushes per agent session, is a 15–30 minute per-session tax that destroys the atomic-commits convention. Agents would batch commits to amortise the cost, defeating ADR 0014's underlying signal granularity.
- **P3 — Smart pre-push: skip Playwright if the diff doesn't touch server/admin/routing paths.** Rejected: heuristic is brittle. A change to `src/utilities/sponsors.ts` doesn't *look* admin-related but is imported by the admin dashboard's preview surface. Missed regressions defeat the purpose. Held in reserve as a fallback if Vitest browser is slower than projected.
- **Pre-commit hook for coverage.** Rejected: pre-commit fires per commit, and atomic-commits convention means many commits per push. Multiplies the per-push cost by the commit count.
- **Mechanical enforcement of `npm run verify`** (e.g. a wrapper script the agent must terminate the task through). Rejected: there is no clean external interception of the agent's loop boundary. Any wrapper the agent should call can also be skipped. The honest answer is that the convention lives in `CLAUDE.md` and the script's exit code; CI catches the slip.
- **Async pre-push: kick off the verify pipeline in background, let the push complete immediately.** Rejected: the entire point is to put the failure inside the agent's execution window. Background completion that the agent never observes is no better than the current CI-after-push state.
- **Compare against fetched `origin/main` coverage on every push** (instead of a local cache). Rejected: requires `gh` auth and network round-trip per push; adds 5–15 s of latency and a class of "I can't push offline" failure modes. Local cache plus authoritative CI is faster and more robust.
- **Run pre-push hook only on the final push of a session** (some kind of session-aware deferral). Rejected: there is no clean signal for "final push of session" — agents push when they're ready, not on a flag. Would require speculative heuristics.

## Consequences

### Positive

- Coverage regressions are visible *inside* the agent's execution window. The most common failure mode this ADR exists to fix — agent finishes, CI fails silently, regression merges — is closed.
- Pre-push wall time stays low enough (~30–90 s) that atomic commits remain ergonomic; the agent doesn't get penalised for committing in small steps.
- `npm run verify` gives a single canonical command for "is my work actually done?" — useful for both agents and humans, and trivially scriptable in a CI matrix or release process.
- The local cache means pre-push works offline. Plane, train, locked-down dev VPN: the gate still runs.

### Negative / Costs

- **Per-push wall-time tax.** Every push pays 30–90 s of Vitest. Over a long session this adds up. Trading off correctness for speed; the trade is judged worth it for agent-driven changes specifically.
- **Local baseline drift.** If the cache was last written days ago and `main` has improved coverage in the meantime, the local gate may pass on something CI rejects. Mitigated by CI being the source of truth, but produces occasional "passed locally, failed in CI" surprise. Acceptable as long as the surprise rate is low.
- **Social enforcement of `npm run verify`.** An agent that fails to read `CLAUDE.md` faithfully (or a future tool with weaker convention adherence) can declare "done" without running verify. CI is the only backstop. The honest cost of not having a mechanical gate.
- **`--no-verify` exists.** Bypass is one flag away. Per global `CLAUDE.md`, agents do not use it without explicit authorisation. A human pushing under deadline can still cut corners, but that is a discipline question this ADR does not solve.
- **First-push-from-fresh-clone is informational only.** Brief gap in the gate's coverage of itself. Resolves on the second push.

## Follow-ups

- **Pre-push hook implementation.** Lands in PR 1 of the ADR-0014 migration, alongside enabling Vitest V8 coverage. Until the cache exists, the hook runs the suite for measurement and writes the cache, but does not gate.
- **`npm run verify` script.**
  - Phase 1 (PR 1 of ADR 0014): runs Vitest only — i.e. equivalent to the pre-push hook.
  - Phase 2 (PR 3 of ADR 0014, when Playwright stands up): expands to the full pipeline including e2e and Monocart merge.
  - `npm run verify:fast` alias retained throughout for the Vitest-only check.
- **`CLAUDE.md` amendment.** Add to *Implementation Conventions*: *"Run `npm run verify` and confirm a green exit before declaring any code-touching task complete. The script is the single canonical gate; do not declare done if it has not run, and do not bypass with `--no-verify`."*
- **Regression threshold.** Default = 0 (any drop in `lines.pct` for any file fails). Surface as a `coverage.threshold` field in `package.json` so it can be tuned without editing the hook script.
- **Cache location and reset documentation.** Add a short note to `CLAUDE.md` (or to a new `docs/coverage.md`) covering: where the cache lives, when it updates, how to reset (`rm .git/last-good-coverage.json`), and the "first push is informational" semantics.
- **Speed monitoring.** Add a simple log line to the pre-push hook reporting wall time. Re-evaluate at the end of the ADR-0014 migration: if median pre-push wall time exceeds 120 s on the developer machine, fall back to P3 (smart pre-push by changed-paths heuristic).
- **CI parity check.** CI runs the same `npm run verify` script (with the baseline source overridden to `main`'s artifact instead of the local cache). One script, two callers, fewer drift modes.
