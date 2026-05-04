# ADR 0014 — Test runtime split and unified V8 coverage

- **Status:** Accepted
- **Date:** 2026-05-04
- **Deciders:** Yannik Zeyer.
- **Supersedes:** none
- **Superseded by:** none
- **Related:** ADR 0008 (single-node deployment topology — sets the e2e environment shape), ADR 0009 (admin authentication — the highest-value e2e surface this ADR aims to cover end-to-end), ADR 0015 (local coverage gates that surface this ADR's signal inside the agent loop).

## Context

AI agents are now a meaningful share of code changes in this repo. The current test setup gives agents (and human reviewers) no integrated way to ask "did this change leave anything uncovered?" because:

- Vitest 4 runs in two projects (`node` for `tests/unit/**`, `dom` jsdom for `src/**/*.test.{ts,tsx}`) with no coverage provider configured.
- Cypress 15 runs 14 e2e specs. `@cypress/code-coverage` is istanbul-based, which does not merge cleanly with V8 coverage from the rest of the stack.
- The Express server's coverage from real admin flows is not measured at all today; only its `supertest`-driven unit tests are.

The goal of this ADR is **agent-change confidence via complete, unified, machine-parsable coverage** on a modern stack. Specifically, every change — agent-driven or human — must produce a single coverage signal that spans the React app, the components, the admin flows, and the Express server under flow conditions.

The Vitest 4 docs explicitly note that browser mode is *"still in its early stages of development"* and recommend *"augment[ing] their Vitest browser experience with a standalone browser-side test runner like WebdriverIO, Cypress or Playwright."* The architecture below honours that recommendation: Vitest browser mode is used narrowly for component-level real-browser tests, with Playwright as the separate runner for full e2e.

## Decision

1. **Test runtime split.** Two Vitest projects, replacing the current node/jsdom split. Mechanical rule: a test file imports React → it runs in the **`browser`** project. It does not → it runs in the **`node`** project. No jsdom anywhere.
   - `node` project: `tests/unit/**/*.test.ts` and any pure-logic test files under `src/**` that contain no JSX.
   - `browser` project: `src/**/*.test.tsx` (and any `.test.ts` under `src/**` that does import React). Vitest browser mode with the **Playwright provider**, **Chromium** only, headless in CI.
2. **e2e runner.** **Playwright**, separate from Vitest. Cypress is retired in full at the end of the migration. Playwright covers admin flows, public-page navigation, routing, and the Instagram proxy.
3. **Coverage providers, all V8.**
   - Vitest projects: **`vitest-monocart-coverage`** custom provider (so Monocart can merge raw output without a format-conversion step).
   - Playwright: **`monocart-reporter`** (CDP coverage from Chromium during e2e).
   - Express server during e2e: booted with `NODE_V8_COVERAGE=./coverage/raw/server-e2e`. A thin wrapper script handles SIGTERM cleanly so V8 flushes the coverage dump on graceful exit.
4. **Merge mechanism.** `monocart-coverage-reports`, configured with the multi-source `inputDir` pattern. Each upstream emits `reports: [['raw']]` to its own subdirectory under `coverage/raw/`. A small `scripts/merge-coverage.mjs` aggregates them, applies `sourcePath` normalization across sources, and produces one merged report.
5. **Consumer interface.** The merged report emits two artifacts:
   - **HTML** under `coverage/report/` — for humans investigating gaps.
   - **`coverage-summary.json`** keyed by file path with line/branch/function metrics — for agents, CI, and a future quality gate.
   - A `scripts/coverage-diff.mjs` script compares `coverage-summary.json` against a baseline fetched from the `main` branch and prints (and exits non-zero on) regressions. Baseline source: the latest CI artifact on `main`, fetched fresh per PR. No baseline file is committed to the repo.
6. **Cypress retirement triage rule.** Each existing spec is bucketed:
   - **Playwright** if it navigates between routes, hits the Express API, exercises auth state, or requires the full mounted app.
   - **Vitest browser project** if it asserts on a single component's real-browser behaviour (layout, focus, DnD, viewport-dependent rendering) without crossing route or server boundaries.
   - **Delete** if it duplicates a unit test or asserts only on static structure that wouldn't survive the assertion's removal.
   - Ambiguous specs default to **Playwright**. Like-for-like ports first; refactoring is a separate follow-up.
7. **Migration sequencing.** Incremental, each PR shippable. PR 1 turns on Vitest V8 coverage on the existing setup so the measurement instrument exists *before* the migration starts. Subsequent PRs add the browser project, stand up Playwright, port specs in batches, and finally delete Cypress and wire the baseline diff into CI. See *Follow-ups*.
8. **No quality gate yet.** The signal is established first; a CI threshold can be added once the baseline is stable. This ADR does not commit to a target percentage.

## Alternatives considered

- **Big-bang migration.** A single PR moving everything: drop jsdom, add Vitest browser, set up Playwright + Monocart, port all 14 Cypress specs, delete Cypress. Rejected: surface area is too large for review; failure modes are entangled ("did this break because of the runner change or the spec port?"); rollback is whole-effort revert.
- **Both runners in parallel for the full transition window.** Add Vitest browser alongside jsdom and Playwright alongside Cypress, port specs over weeks, delete Cypress only at the very end. Rejected: doubled CI time during the window, and every contributor (human or agent) has to answer "which setup gets this new test?" each time.
- **Collapse e2e onto Vitest browser mode (drop a separate Playwright runner).** Vitest browser + Playwright provider can run real e2e in principle. Rejected because Vitest's own documentation explicitly recommends a separate e2e runner alongside browser mode, and flags browser mode as early-stage. Tying our e2e suite to browser mode's evolution would be an unforced platform-API risk.
- **Keep jsdom as the default for component tests; promote to browser only on need.** Rejected because the promotion criterion ("jsdom is adequate vs polite fiction") is judgment, not a mechanical rule. For a setup intended to be agent-readable for years, "no judgment required" beats a 200ms-per-test speed win.
- **Cypress + `@cypress/code-coverage` (istanbul) merged with V8 sources via a converter.** Rejected: format-conversion adds a fragile step, and Cypress is the runner this ADR is trying to retire on independent grounds (modern stack, better trace tooling, parallel execution model that fits CI).
- **HTML-only coverage consumer.** Cheapest option — `@vitest/coverage-v8` enabled, look at the report manually. Rejected: under-uses the migration. Without a JSON summary an agent can read, the report is a curiosity, not a gate or a signal.
- **Per-test test-to-source mapping** (so an agent can run only the tests covering a touched file). Rejected for now: Monocart supports this via CDP, but the operational complexity (per-test trace files, larger artifacts, slower runs) is unjustified at the current suite size. Revisit once the suite is ~10× larger.
- **Don't instrument the Express server during e2e.** Server coverage from unit tests only. Rejected: the gap between "this route is unit-tested" and "this route is exercised by a real admin flow" is exactly the kind of gap an agent's refactor can introduce undetected. `NODE_V8_COVERAGE` is a standard env-var-and-go affair, not bespoke instrumentation.

## Consequences

### Positive

- Single merged coverage report spanning server, components, admin flows, and the Express server *under flow conditions*. Honest signal, machine-parseable.
- Mechanical "imports React → browser project" rule eliminates a class of "where does this test belong?" debates from now on.
- Vitest's own "augment with a separate e2e runner" recommendation is honoured; browser mode's early-stage risk is bounded to a small set of component tests.
- Each migration PR is independently shippable and revertible. No half-migrated branches.
- The coverage measurement instrument exists from PR 1, so the migration's *own* impact on coverage is visible at every step.

### Negative / Costs

- **Component-test loop slows down.** Real Chromium per-file is seconds, not the milliseconds jsdom delivers. Local watch mode and CI both pay this. One-time ceiling shift, not an ongoing tax — accepted in exchange for zero false-green from jsdom shims.
- **`vi.mock` audit needed.** Browser mode seals the module namespace; `vi.spyOn(import, …)` patterns must be rewritten as `vi.mock('./module.js', { spy: true })`. Existing `tests/setup-dom.ts` and jest-dom matchers need re-validation. Expect 1–2 days of weird breakages during PR 2.
- **Two test runners coexist briefly** during PRs 3 through N. CI time roughly doubles in that window. Bounded by an explicit "delete Cypress at PR N+1" milestone.
- **Server e2e teardown is sensitive.** V8 only flushes coverage on graceful exit, so the e2e server wrapper must SIGTERM (not SIGKILL) and wait for the dump. Test-runner crash modes can drop a run's server coverage. Mitigated but not eliminated.
- **Platform risk on Vitest browser mode.** Documented as early-stage. Acceptable because the blast radius (a small set of Tier-C component specs) is contained; if v5 reshapes the API, only those tests churn.
- **Monocart is a smaller-community project than Istanbul.** Stack risk, but Monocart is used as a *report producer* over standardised V8 raw output — if it goes stale, the raw V8 dumps survive and another tool can ingest them.

## Follow-ups

- **PR 1 — Coverage on existing setup.** Add `@vitest/coverage-v8` (or `vitest-monocart-coverage` if preferable from PR 1) to the current node + dom projects. Emit `coverage-summary.json`. Capture initial baseline. No runner changes.
- **PR 2 — Vitest browser project.** Add the `browser` project (Playwright provider, Chromium). Migrate Tier-A pure-logic tests into the `node` project. Drop the `dom` (jsdom) project once empty. Run the `vi.mock` audit.
- **PR 3 — Playwright + Monocart proof of concept.** Stand up Playwright with `monocart-reporter`. Add the e2e server wrapper script with `NODE_V8_COVERAGE` and clean SIGTERM handling. Port 1–2 admin Cypress specs as the first concrete migration.
- **PRs 4..N — Port remaining Cypress specs** in batches of 2–4. Each PR ships green. Specs ported per the triage rule above.
- **PR N+1 — Cypress removal.** Delete `cypress.config.ts`, `cypress/`, prune Cypress and `@testing-library/cypress` (if present) deps, remove the `test:e2e*` and `test:admin*` scripts in `package.json` and replace with Playwright equivalents.
- **PR N+2 — Baseline diff in CI.** Implement `scripts/coverage-diff.mjs`; fetch `main`'s latest `coverage-summary.json` artifact in CI; fail PR build on regression. Comment the delta on the PR.
- **Documentation.** Update `CLAUDE.md` with the new test-placement rule and the e2e server wrapper invocation (replacing the manual `DB_PATH=/tmp/clubsoft-e2e/...` recipe). Agent contract for the coverage gate (when to run `npm run verify`, bypass policy, baseline cache) is owned by ADR 0015 and edited there.
- **Quality-gate decision (deferred).** Once the baseline has stabilised over a few weeks, decide whether to add a CI percentage threshold. Deliberately out of scope here.
- **Per-test mapping (deferred).** Reopen the test-to-source mapping question once the suite grows ~10× or test-selection latency becomes a real friction. Until then, the merged-totals model is enough.
- **Vitest browser stability review.** When Vitest 5 ships, re-evaluate whether browser mode has graduated from "early stages" and whether the Tier-C-only scoping is still the right cap.
