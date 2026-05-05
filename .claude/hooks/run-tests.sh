#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Check if any source files were modified (staged or unstaged)
CHANGED=$(git diff --name-only HEAD 2>/dev/null; git diff --name-only --cached 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null)

# Filter to only source/config files that matter
CODE_CHANGED=$(echo "$CHANGED" | grep -E '\.(ts|astro|css|json|mjs)$' | grep -v 'node_modules' | grep -v 'package-lock' || true)

if [ -z "$CODE_CHANGED" ]; then
  echo '{"ok": true}'
  exit 0
fi

ERRORS=""

# --- Unit tests ---
echo "Running unit tests..." >&2
if ! npx vitest run 2>&1; then
  ERRORS="Unit tests failed."
fi

# --- E2E tests ---
# scripts/run-e2e.mjs (the canonical e2e wrapper from ADR 0014/0015) boots its
# own Express server with NODE_V8_COVERAGE wired up, seeds the per-run SQLite
# DB, runs Playwright, then propagates SIGTERM so V8 flushes coverage. No
# external dev server / curl-readiness loop needed here.
echo "Running E2E tests..." >&2
if ! npm run test:e2e 2>&1; then
  ERRORS="${ERRORS} E2E tests failed."
fi

# Report results
if [ -n "$ERRORS" ]; then
  echo "{\"ok\": false, \"reason\": \"$ERRORS Please fix the failing tests.\"}"
else
  echo '{"ok": true}'
fi
exit 0
