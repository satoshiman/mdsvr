---
title: Reference
description: API and CLI reference documentation for mdsvr
---

# Reference for testing

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

| Option                | Description        |
| --------------------- | ------------------ | ---------------------- |
| `-e, --export [PATH]` | Export static HTML | `PATH`: `_html/public` |

#### Utility Options

| Option          | Description                        |
| --------------- | ---------------------------------- |
| `--init`        | Create starter `settings.json`     |
| `--validate`    | Validate `settings.json` and exit  |
| `--no-watch`    | Disable `settings.json` hot-reload |
| `-v, --version` | Print version                      |
| `-h, --help`    | Print help                         |

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

#### With Auto-Open

```bash
npx mdsvr ./docs --open
```

#### Export Static Site

```bash
# Default output (_html/public)
npx mdsvr ./docs --export

# Custom output
npx mdsvr ./docs --export ./dist
```

#### Initialize Config

```bash
npx mdsvr ./docs --init
```

Creates `_mdsvr/settings.json` with starter configuration.

#### Validate Settings

```bash
npx mdsvr ./docs --validate
```

Checks `settings.json` for errors without starting server.

### Environment Variables

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

- [Configuration](../2.-settings/README.md) — Practical configuration guide
- [Features](../3.-features/README.md) — Feature documentation
- [Getting Started](../1.-getting-started/README.md) — Quick start guides
