---
title: Reference
description: API and CLI reference documentation for mdsvr
---

# Reference

Technical reference documentation for mdsvr.

---

## CLI Reference

Complete reference for all mdsvr CLI commands and options.

### Global Usage

```bash
npx mdsvr [dir] [options]
```

Or if installed globally:

```bash
mdsvr [dir] [options]
```

### Arguments

| Argument | Description             | Default                 |
| -------- | ----------------------- | ----------------------- |
| `[dir]`  | Root directory to serve | `.` (current directory) |

### Options

#### Server Options

| Option         | Description             | Default     |
| -------------- | ----------------------- | ----------- |
| `-p, --port N` | Port number             | `1800`      |
| `--host H`     | Bind address            | `localhost` |
| `-o, --open`   | Auto-open browser       | `false`     |
| `-s, --silent` | Suppress console output | `false`     |

#### Export Options

| Option                | Description                                   |
| --------------------- | --------------------------------------------- |
| `-e, --export [PATH]` | Export static HTML (default: `_html/public`)  |
| `--force-og`          | Force full OG image regeneration (skip cache) |

#### Utility Options

| Option          | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| `--init`        | Create starter `settings.json`                               |
| `--validate`    | Validate `settings.json` and exit                            |
| `--validate-md` | Validate all markdown files and exit                         |
| `--autofix`     | Auto-fix markdown validation errors (use with --validate-md) |
| `--no-watch`    | Disable `settings.json` hot-reload                           |
| `-v, --version` | Print version                                                |
| `-h, --help`    | Print help                                                   |

### Examples

#### Basic Server

```bash
# Serve current directory
npx mdsvr

# Serve specific folder
npx mdsvr ./docs

# Custom port
npx mdsvr ./docs --port 3000

# Expose to LAN
npx mdsvr ./docs --host 0.0.0.0 --port 1800
```

## With Auto-Open

```bash
npx mdsvr ./docs --open
```

## Export Static Site

```bash
# Default output (_html/public)
npx mdsvr ./docs --export

# Custom output
npx mdsvr ./docs --export ./dist

# Force full OG image regeneration
npx mdsvr ./docs --export --force-og
```

## Initialize Config

```bash
npx mdsvr ./docs --init
```

Creates `_mdsvr/settings.json` with starter configuration.

## Validate Settings

```bash
npx mdsvr ./docs --validate
```

Checks `_mdsvr/settings.json` for errors without starting server.

## Validate Markdown Files

```bash
# Validate all markdown files
npx mdsvr ./docs --validate-md

# Validate with auto-fix
npx mdsvr ./docs --validate-md --autofix
```

Checks all markdown files for:

- 🔗 Broken internal links (with fuzzy matching suggestions)
- 📝 Heading hierarchy issues
- 📌 Missing H1 headings
- 🖼️ Missing assets (images, fonts, etc.)

The `--autofix` flag automatically fixes broken links using fuzzy matching (e.g., `traget.md` → `target.md`).

## Environment Variables

| Variable | Description                                   |
| -------- | --------------------------------------------- |
| `PORT`   | Default port (if not specified with `--port`) |
| `HOST`   | Default host (if not specified with `--host`) |

### Exit Codes

| Code | Meaning                    |
| ---- | -------------------------- |
| `0`  | Success                    |
| `1`  | General error              |
| `2`  | Invalid arguments          |
| `3`  | Settings validation failed |

---

## Coming Soon

- JavaScript API reference
- Configuration schema documentation
- Component API reference

---

## Related

- [Configuration](../02-settings) — Practical configuration guide
- [Features](../03-features) — Feature documentation
- [Getting Started](../01-getting-started) — Quick start guides
