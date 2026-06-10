# mdsvr

> Full-featured documentation website server with **MDX support**, **site-wide settings**, **dark/light mode**, **SEO meta tags**, **search ready**, and **auto-generated navigation**.

Transform any folder of Markdown/Markdown files into a beautiful documentation website — zero config required.

```text
█   █ ████   ████ █   █ ████
██ ██ █   █ █     █   █ █   █
█ █ █ █   █  ███  █   █ ████
█   █ █   █     █  █ █  █  █
█   █ ████  ████    █   █   █

     [markdown server]
```

```bash
npx mdsvr ./docs
```

## What's New in v2.0

| Feature            | v1  | v2                      |
| ------------------ | --- | ----------------------- |
| Markdown rendering | ✅  | ✅ Enhanced             |
| MDX support        | ❌  | ✅ Full pipeline        |
| Site settings      | ❌  | ✅ `settings.json`      |
| Dark/Light mode    | ❌  | ✅ Toggle + auto        |
| SEO meta tags      | ❌  | ✅ OG, Twitter, sitemap |
| Sidebar navigation | ❌  | ✅ Auto-generated       |
| Search             | ❌  | ✅ Full-text            |
| Sitemap/RSS        | ❌  | ✅ Auto-generated       |

## Quick Start

```bash
# One-shot, no install
npx mdsvr ./docs

# Create a starter settings.json
npx mdsvr ./docs --init

# With options
npx mdsvr ./notes --port 1800 --open

# Expose to LAN
npx mdsvr . --host 0.0.0.0 --port 1800
```

## Why Port 1800?

Just like a 1-800 toll-free number is globally recognized as a dedicated hotline for customer support and guidance, mdsvr uses port 1800 as your local "hotline" for project documentation. It's easy to remember, avoids conflicts with common development ports (like 3000 or 8080), and serves as the central hub where users go to get their questions answered.

## Installation

```bash
npm install -g mdsvr
mdsvr ./docs
```

## Docker

Pull and run with Docker:

```bash
docker pull thedeployer/mdsvr:latest
docker run -d --name docs-server -p 1800:1800 -v /path/to/docs:/app/docs thedeployer/mdsvr:latest
```

Then open http://localhost:1800 in your browser.

### Build from source

```bash
docker build -t mdsvr:latest .
docker run -d --name docs-server -p 1800:1800 -v /path/to/docs:/app/docs mdsvr:latest
```

## CLI Usage

```
Usage: mdsvr [dir] [options]

Options:
  [dir]              Root directory to serve (default: .)
  -p, --port N       Port number (default: 1800)
  --host H           Bind address (default: localhost)
  -o, --open         Auto-open browser
  -s, --silent       Suppress console output
  --init             Create a starter settings.json in [dir]
  --validate         Validate settings.json and exit
  --no-watch         Disable settings.json hot-reload
  -v, --version      Print version
  -h, --help         Print this help
```

## Configuration (`settings.json`)

Place `settings.json` in your docs root for full customization:

```json
{
  "$schema": "https://mdsvr.dev/schema/v2.json",
  "site": {
    "title": "My Docs",
    "description": "Project documentation",
    "language": "en"
  },
  "appearance": {
    "defaultTheme": "system",
    "allowThemeToggle": true,
    "accentColor": "#0969da"
  },
  "navigation": {
    "sidebar": { "enabled": true },
    "tocEnabled": true
  },
  "search": { "enabled": true },
  "seo": {
    "generateSitemap": true,
    "generateRssFeed": false
  },
  "mdx": { "enabled": true }
}
```

Create one with `npx mdsvr ./docs --init`.

## MDX Support

Write interactive documentation with MDX:

```mdx
---
title: Getting Started
description: How to install and configure
---

# Getting Started

<Callout type="warning">Make sure you have Node.js 18+ installed.</Callout>

<Steps>
  ### Install the package
  Run `npm install mdsvr`

### Create your docs folder

Create a `./docs` directory

### Start the server

Run `npx mdsvr ./docs --open`

</Steps>

<CardGroup cols={2}>
  <Card title="Quick Start" icon="⚡" href="/quickstart">
    Get up and running in 5 minutes
  </Card>
  <Card title="Configuration" icon="⚙️" href="/config">
    Full settings reference
  </Card>
</CardGroup>
```

### Built-in MDX Components

- `<Callout type="info|warning|danger|success|tip">` - Highlighted boxes
- `<CodeGroup title="...">` - Tabbed code blocks
- `<Steps>` - Numbered step-by-step guide
- `<Card title="..." icon="..." href="...">` - Link cards
- `<CardGroup cols={2}>` - Grid layout for cards
- `<Tabs items={[...]}>` - Tabbed content
- `<Accordion title="...">` - Collapsible sections
- `<Badge color="green|orange|red|blue|purple|gray">` - Status badges
- `<Mermaid>` - Diagrams (client-side rendered)

## Programmatic API

```typescript
import { createServer } from "mdsvr";

const server = await createServer("./docs", {
  port: 4000,
  host: "localhost",
  open: true,
  silent: false,
  watchSettings: true, // Auto-reload on settings.json changes
});

console.log(`Running at ${server.url}`);
console.log(`Settings: ${server.settings.site.title}`);

// Manual settings reload
await server.reloadSettings();

// Graceful shutdown
process.on("SIGINT", () => server.close());
```

### Accessing Settings

```typescript
import { loadSettings, validateSettingsFile } from "mdsvr";

// Load settings from directory
const settings = await loadSettings("./docs");

// Validate settings.json
const result = await validateSettingsFile("./docs");
if (!result.valid) {
  console.error(result.errors);
}
```

## Generated Endpoints

When enabled in `settings.json`:

| Endpoint             | Description                         |
| -------------------- | ----------------------------------- |
| `/sitemap.xml`       | XML sitemap for search engines      |
| `/feed.xml`          | RSS feed for blog posts             |
| `/search-index.json` | Search index for client-side search |

## Features

- **Markdown rendering**: `.md` files automatically rendered as beautiful HTML
- **MDX support**: Interactive components in your docs
- **Directory listings**: Browse directories with clickable file links
- **Static files**: Serve any file type with correct MIME types
- **Syntax highlighting**: Code blocks highlighted with highlight.js
- **Anchor links**: Headers have clickable anchors
- **Sidebar navigation**: Auto-generated from your file structure
- **Table of contents**: Auto-generated from page headings
- **Dark/Light mode**: Toggle or auto-detect system preference
- **Full-text search**: Client-side search with keyboard shortcut (⌘K)
- **SEO optimized**: Open Graph, Twitter Cards, canonical URLs, sitemap
- **Mobile responsive**: Works on all devices
- **Hot reload**: Settings auto-reload on change
- **Path traversal protection**: Secure by default
- **Zero config**: Works out of the box, fully customizable

## File Structure

```
docs/
├── settings.json      # Site configuration (optional)
├── README.md          # Homepage (auto-detected)
├── guide/
│   ├── getting-started.md
│   └── configuration.mdx
├── api/
│   └── reference.md
└── assets/
    └── logo.svg
```

## Security

- **Path traversal**: Resolved paths are verified to be within root directory
- **Hidden files**: Files starting with `_` or listed in `settings.json` are hidden
- **Blocked extensions**: `.env`, `.key`, `.pem`, etc. are blocked by default
- **Read-only**: Server only serves files, no write operations

## Requirements

- Node.js 18+

## License

MIT
