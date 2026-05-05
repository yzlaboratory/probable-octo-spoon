# YO
```
ssh future

cd /home/workspace/probable-octo-spoon

scp .runtime.env user@ip:/home/workspace/probable-octo-spoon/.runtime.env

docker compose down
docker compose build
docker compose up -d
```

## Tests & coverage

Two Vitest projects + Playwright e2e, merged into one coverage report.

### Test projects

| Project | Glob | Runtime | What goes here |
|---|---|---|---|
| `node` | `tests/unit/**/*.test.ts` | Node | Server, scripts, pure logic — anything that does **not** import React |
| `browser` | `src/**/*.test.{ts,tsx}` | Real Chromium (headless, Playwright provider) | React component / hook tests — anything that does import React |
| Playwright e2e | `e2e/**/*.spec.ts` | Real Chromium against the built app | End-to-end flows |

Placement is mechanical: imports React → `browser`. Otherwise → `node`.

### Running tests

```bash
npm test               # Vitest, both projects, no coverage
npm run test:watch     # Watch mode
npm run test:coverage  # Vitest with coverage → coverage/coverage-final.json (Istanbul)

npm run test:e2e       # Playwright e2e against a real Express server
npm run test:admin     # Same, plus seeds an admin user from ~/.credentials so admin specs run

npm run verify         # The full gate: vitest + e2e + merged coverage diff vs baseline
npm run verify:fast    # Fast tier (Vitest only) — same as the pre-push hook
```

A Husky `pre-push` hook runs `verify:fast` automatically.

### Checking coverage

After `npm run verify` you get a single merged report:

```
coverage/
├── coverage-summary.json   # Final merged per-file %s (verify reads this)
├── coverage-final.json     # Final merged Istanbul JSON
├── index.html              # Vitest HTML report (unit tests)
└── report/
    └── index.html          # Monocart HTML report (e2e tier)
```

Quick ways to read it:

```bash
# One-line totals
node -e 'const t=require("./coverage/coverage-summary.json").total; for(const k of["lines","statements","functions","branches"]) console.log(k, t[k].pct+"%")'

# Files with the most uncovered statements (good targets for new tests)
node -e '
const d=require("./coverage/coverage-summary.json");
Object.entries(d).filter(([k])=>k!=="total")
  .map(([k,v])=>[k, v.statements.total-v.statements.covered])
  .sort((a,b)=>b[1]-a[1]).slice(0,15)
  .forEach(([k,n])=>console.log(n.toString().padStart(4), k));
'

# Open the HTML drill-downs
open coverage/index.html         # browser/node unit tests
open coverage/report/index.html  # e2e tier
```

### How the merge works

1. **Vitest** uses the built-in `@vitest/coverage-v8` provider for both projects → writes Istanbul JSON to `coverage/coverage-final.json`.
2. **Playwright** captures browser-side V8 coverage (via `monocart-reporter`) into `coverage/raw/playwright/`.
3. **Server-e2e** uses `NODE_V8_COVERAGE` to dump raw V8 from the Express server into `coverage/raw/server-e2e/`.
4. `scripts/merge-coverage.mjs` converts the e2e raw V8 to Istanbul (via `monocart-coverage-reports`) and merges all sources with `istanbul-lib-coverage`'s standard merge — the same approach `nyc merge` uses.
