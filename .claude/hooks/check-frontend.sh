#!/bin/bash
# Deterministic check: is the changed file a frontend file?
# Reads hook JSON from stdin, exits 0 (frontend) or 1 (not frontend).

FILE=$(jq -r '.tool_input.file_path // .tool_input.filePath // ""' 2>/dev/null)

if [ -z "$FILE" ]; then
  exit 1
fi

# Skip test files — they don't render in the actual app.
if echo "$FILE" | grep -qE '\.(test|spec)\.tsx?$'; then
  exit 1
fi

# Match frontend file patterns
if echo "$FILE" | grep -qE '(src/components/.*\.tsx|src/pages/.*\.tsx|src/styles/.*\.css|/index\.html)$'; then
  # Return JSON that injects the visual verification reminder
  cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"VISUAL VERIFICATION NEEDED: A frontend file was changed. Before considering this change done, you MUST: 1) Write a temporary Playwright spec at e2e/_visual-check.spec.ts that screenshots the affected page(s) at desktop (1440x900) and mobile (375x812) viewports (use page.setViewportSize() + page.screenshot({ path: 'screenshots/<name>.png' })), 2) Run it via `npm run test:e2e -- e2e/_visual-check.spec.ts` (the wrapper boots its own dist + Express server, no manual preview), 3) READ the screenshot images to visually verify the change looks correct, 4) Delete the temp spec and screenshots dir. Only screenshot pages affected by the change — map component files to their pages (e.g. Header.tsx affects all pages, NewsDetail.tsx affects /news/* pages, Footer.tsx affects all pages, HomePage.tsx affects / only). Do NOT skip this step."}}
EOF
  exit 0
fi

exit 1
