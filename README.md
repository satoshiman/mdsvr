# mdsvr

Static file server with auto-render Markdown → HTML. Similar to Vercel's `serve` but understands `.md` files.

## Quick Start

```bash
# One-shot, no install
npx mdsvr ./docs

# With options
npx mdsvr ./notes --port 4000 --open

# Expose to LAN
npx mdsvr . --host 0.0.0.0 --port 8080
```

## Installation

```bash
npm install -g mdsvr
mdsvr ./docs
```

## CLI Usage

```
Usage: mdsvr [dir] [options]

Options:
  [dir]              Root directory to serve (default: .)
  -p, --port N       Port number (default: 3000)
  --host H           Bind address (default: localhost)
  -o, --open         Auto-open browser
  -s, --silent       Suppress console output
  -v, --version      Print version
  -h, --help         Print this help
```

## Programmatic API

```typescript
import { createServer } from "mdsvr";

const server = await createServer("./docs", { port: 4000, open: true });
console.log(`Running at ${server.url}`);

// Graceful shutdown
process.on("SIGINT", () => server.close());
```

## Features

- **Markdown rendering**: `.md` files automatically rendered as beautiful GitHub-style HTML
- **Directory listings**: Browse directories with clickable file links
- **Static files**: Serve any file type with correct MIME types
- **Syntax highlighting**: Code blocks highlighted with highlight.js
- **Anchor links**: Headers have clickable anchors
- **Mobile responsive**: Works on all devices
- **Path traversal protection**: Secure by default
- **Zero config**: Works out of the box

## License

MIT
