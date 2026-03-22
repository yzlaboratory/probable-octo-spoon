#!/bin/bash
# Deterministic check: is the changed file a frontend file?
# Reads hook JSON from stdin, exits 0 (frontend) or 1 (not frontend).

FILE=$(jq -r '.tool_input.file_path // .tool_input.filePath // ""' 2>/dev/null)

if [ -z "$FILE" ]; then
  exit 1
fi

# Match frontend file patterns
if echo "$FILE" | grep -qE '(src/components/.*\.tsx|src/pages/.*\.tsx|src/styles/.*\.css|/index\.html)$'; then
  # Return JSON that injects the visual verification reminder
  cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"VISUAL VERIFICATION NEEDED: A frontend file was changed. Before considering this change done, you MUST: 1) Build the project (npm run build), 2) Start preview server (npm run preview &), 3) Write a temporary Cypress spec at cypress/e2e/_visual-check.cy.ts that screenshots the affected page(s) at desktop (1440x900) and mobile (375x812) viewports, 4) Run it and READ the screenshot images to visually verify the change looks correct, 5) Delete the temp spec and screenshots dir, 6) Kill the preview server (pkill -f 'vite preview'). Only screenshot pages affected by the change — map component files to their pages (e.g. Header.tsx affects all pages, NewsDetail.tsx affects /news/* pages, Footer.tsx affects all pages, HomePage.tsx affects / only). Do NOT skip this step."}}
EOF
  exit 0
fi

exit 1
