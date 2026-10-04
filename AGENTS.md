# Project Rules for mdsvr

## Project Overview

`mdsvr` is an npm CLI package and programmatic API for serving Markdown/MDX documentation websites. Source code is in `src/`, tests are in `test/`, project documentation is in `docs/`, generated documentation output is in `gh-pages/`, and historical implementation specifications are in `agent/`.

Treat files in `agent/` as historical specifications unless the current source, tests, and documentation confirm they remain accurate. See `agent/README.md` for the local agent workspace conventions.

## Commands

```bash
npm run build
npm test
npm run dev
npm run start -- ./docs
npm run docs:generate
```

Use Node.js 22 or newer. Run the most focused relevant tests first, then `npm test` for changes that can affect the complete package.

## Working Rules

- Verify behavior from the current source and tests; do not assume old files in `agent/` describe the current implementation.
- Follow existing TypeScript and Node.js ESM conventions.
- Add or update tests for behavior changes and bug fixes when test coverage is practical.
- Do not edit generated output in `dist/` or `dist-test/` directly.
- Do not include secrets, credentials, machine-local configuration, tool attribution, or co-author trailers in commits or documentation.
- Do not include unrelated user changes in a commit.

## Event Logging (V2 — Git Integration)

Agents must log events for features, bug fixes, refactors, maintenance or chores, documentation updates, and other significant changes in the `md-serve` repo.

### Event Script

The workspace script is `/Users/apple/md-serve/agent/event.py`. It is a relative symlink to `/Users/apple/agent-workspaces/scripts/event.py`. Event context is determined by the directory containing `agent/workspace.json`.

Run commands from the local workspace:

```bash
cd /Users/apple/md-serve/agent
python3 event.py <subcommand>
```

From another directory, pass the workspace directory explicitly:

```bash
python3 /Users/apple/agent-workspaces/scripts/event.py --ws /Users/apple/md-serve/agent <subcommand>
```

For a different machine path, create `agent/workspace.local.json` or export `AGENTS_WORKSPACE_ROOT`. Never commit `workspace.local.json`. See `/Users/apple/agent-workspaces/AGENTS.md` for the shared tooling behavior.

### When to Log Events

- Do not log events for changes inside `/Users/apple/agent-workspaces/`; commit those only in that tooling repo.
- For project code or documentation changes, commit first and log the event afterward so it links to the commit containing the change.
- Do not log while the relevant repo working tree is dirty.
- For research or planning without a commit, use `--no-commit`.
- If an event points to the wrong commit, repair it with `git link`.

Valid event types are `Feature`, `Fix`, `Refactor`, `Chore`, and `Docs`.

### Logging Examples

```bash
cd /Users/apple/md-serve/agent

# Basic log: capture the current md-serve HEAD
python3 event.py log \
  --title "Add Markdown validation" \
  --scope "src/validator" \
  --type Feature \
  --desc "Validate internal links and heading structure" \
  --files "src/validator/index.ts\ntest/validator.test.ts" \
  --notes "Run npm test before release"

# Pull changed files from the linked commit
python3 event.py log --from-commit \
  --title "Fix canonical directory redirects" \
  --scope "src/router.ts" \
  --type Fix \
  --desc "Preserve canonical directory URLs"

# Research or planning with no commit
python3 event.py log --no-commit \
  --title "Plan incremental OG export" \
  --scope "src/generators" \
  --type Docs \
  --desc "Document the implementation approach"

# Link an explicit commit and repo
python3 event.py log --commit abc1234 --repo md-serve \
  --title "Update CLI documentation" \
  --scope "docs/04-reference" \
  --type Docs \
  --desc "Document current CLI options"
```

### Search Events

```bash
cd /Users/apple/md-serve/agent

python3 event.py search "markdown"
python3 event.py search --type Fix "redirect"
python3 event.py search --file src/router.ts
python3 event.py search --from 2026-10-01 --to 2026-10-04 "validation"
python3 event.py search --commit abc1234
python3 event.py search --repo md-serve "MDX"
python3 event.py search --limit 5 --compact "export"
```

### Git Links

```bash
cd /Users/apple/md-serve/agent

python3 event.py git unlinked
python3 event.py git verify
python3 event.py git link --event "2026-10-04 09:43" --commit abc1234
python3 event.py git auto-link
```

### Timeline

```bash
cd /Users/apple/md-serve/agent

python3 event.py timeline
python3 event.py timeline --date 2026-10-04
```

### Revert Safety

For a request in the form `[REVERT] ~N`:

1. Run a dry-run only.
2. Present the proposed git actions to the user.
3. Wait for explicit confirmation.
4. Execute the revert only after confirmation.

```bash
cd /Users/apple/md-serve/agent

# Read-only planning
python3 event.py revert ~3 --dry-run

# Run only after explicit user confirmation
python3 event.py revert ~3 --yes
```

Never run a destructive revert, reset, or equivalent operation without explicit user confirmation.
