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
echo "Starting dev server for E2E tests..." >&2

# Start dev server
npx astro dev &
DEV_PID=$!

# Wait for server to be ready (max 30s)
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "" http://localhost:4321 2>/dev/null; then
    break
  fi
  if [ "$i" -eq 30 ]; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
    ERRORS="${ERRORS} Dev server failed to start within 30s, E2E tests skipped."
    echo "{\"ok\": false, \"reason\": \"$ERRORS\"}"
    exit 0
  fi
  sleep 1
done

echo "Running E2E tests..." >&2
if ! npx cypress run 2>&1; then
  ERRORS="${ERRORS} E2E tests failed."
fi

# Stop dev server
kill "$DEV_PID" 2>/dev/null || true
wait "$DEV_PID" 2>/dev/null || true

# Report results
if [ -n "$ERRORS" ]; then
  echo "{\"ok\": false, \"reason\": \"$ERRORS Please fix the failing tests.\"}"
else
  echo '{"ok": true}'
fi
exit 0
