# Issue tracker: Local Markdown

Issues and PRDs for this repo live as markdown files in `docs/ephemeral/`.

This directory is gitignored — issues are local-only working notes, not committed history.

## Conventions

- One feature per directory: `docs/ephemeral/<feature-slug>/`
- The PRD is `docs/ephemeral/<feature-slug>/PRD.md`
- Implementation issues are `docs/ephemeral/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Status is recorded as a `Status:` line near the top of each issue file (free-form — no canonical label vocabulary)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `docs/ephemeral/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.
