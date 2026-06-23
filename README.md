# mdsvr

[![npm version](https://badge.fury.io/js/mdsvr.svg)](https://www.npmjs.com/package/mdsvr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)
[![Docs](https://img.shields.io/badge/docs-mdsvr.js.org-blue)](https://mdsvr.js.org/docs)

> **The fastest way from Markdown to beautiful docs.** Zero config, one command, 10 seconds.

📖 **[Official Documentation](https://mdsvr.js.org/docs)**

Transform any folder of Markdown files into a full-featured documentation website — no build step, no configuration required.

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
# That's it. That's the whole setup.
```

## Why mdsvr?

| Feature          | mdsvr          | Docusaurus  | Nextra         | MkDocs      |
| ---------------- | -------------- | ----------- | -------------- | ----------- |
| Setup time       | **10 seconds** | 5 minutes   | 3 minutes      | 3 minutes   |
| Config required  | ❌ No          | ✅ Yes      | ✅ Yes         | ✅ Yes      |
| Build step       | ❌ Not needed  | ✅ Required | ✅ Required    | ✅ Required |
| MDX support      | ✅ Full        | ✅ Full     | ✅ Full        | ❌ No       |
| Full-text search | ✅ Client-side | Algolia API | ✅ Client-side | ✅ Built-in |
| Docker image     | ✅ Official    | DIY         | DIY            | DIY         |
| Startup time     | **150ms**      | ~8.5s build | ~6.2s build    | ~3s build   |
| Language         | Node.js        | Node.js     | Node.js        | Python      |

> mdsvr is **56× faster to start** than Docusaurus and requires **zero configuration**.

> The measurement is based on MacBook with M1 chip, can be different on other devices.

## Features

### Markdown & MDX Rendering

Serve `.md` and `.mdx` files as fully rendered HTML pages. MDX support enables interactive React components inline with your content — callouts, steps, tabs, code groups, and more — all processed server-side with zero client-side framework required.

### Site Settings (`_mdsvr/settings.json`)

Place a `_mdsvr/settings.json` in your docs root to configure everything: site title, description, language, accent color, theme, navigation, search, SEO, and MDX. Validated against a JSON Schema. Hot-reloads automatically when changed — no server restart needed.

### Dark / Light Mode

Visitors can toggle between dark and light themes, or let the server respect their OS preference automatically (`system` default). The accent color is fully customizable.

### Sidebar Navigation

Auto-generated from your file structure. Directories and files appear as collapsible sections and links without any manual configuration. The active page is highlighted.

### Table of Contents

Every page gets an auto-generated in-page TOC from its headings (`##`, `###`, etc.), making long documents easy to navigate.

### Full-Text Search

Client-side full-text search powered by a pre-built `/search-index.json`. Triggered by the `⌘K` (or `Ctrl+K`) keyboard shortcut. No external service required.

### SEO & Meta Tags

Generates Open Graph and Twitter Card meta tags for every page. Canonical URLs, `<title>` tags, and descriptions are derived from front matter or page content. Includes auto-generated `/sitemap.xml` and `/feed.xml` (RSS) when enabled.

### Mermaid Diagrams

Render ` ```mermaid ``` ` code blocks as interactive diagrams. Supports fullscreen mode with pan, zoom, and a source view toggle — all client-side with no extra setup.

### Syntax Highlighting

Code blocks are highlighted using highlight.js with support for dozens of languages. The highlight style adapts to the current dark/light theme.

### Markdown Validation

Validate all markdown files for common issues like broken links, missing front matter, inconsistent heading levels, and more. Use `--validate-md` to check your docs and `--autofix` to automatically fix common errors.

### Static HTML Export

Export your entire docs site to clean static HTML files suitable for hosting on Firebase, Netlify, GitHub Pages, or any static host. Generates clean URLs (`/guide/setup/` instead of `/guide/setup.html`) and auto-creates index pages for directories without a README.

### Directory Listings

When navigating to a directory without a README, mdsvr renders a clean listing of its contents with clickable links to files and subdirectories.

### Security

- Resolved paths are verified to stay within the root directory (path traversal protection)
- Files starting with `_` or listed as hidden in settings are not served
- Sensitive extensions (`.env`, `.key`, `.pem`, etc.) are blocked by default
- Server is strictly read-only — no write operations exposed

## Quick Start

```bash
# One-shot, no install
npx mdsvr ./docs

# Create a starter _mdsvr/settings.json
npx mdsvr ./docs --init

# With options
npx mdsvr ./notes --port 1800 --open

# Expose to LAN
npx mdsvr . --host 0.0.0.0 --port 1800

# Export to static HTML (Firebase, Netlify, GitHub Pages)
npx mdsvr ./docs --export
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
  -e, --export [PATH]  Export static HTML (default: _html/public)
  --init             Create a starter _mdsvr/settings.json in [dir]
  --validate         Validate _mdsvr/settings.json and exit
  --validate-md      Validate all markdown files and exit
  --autofix          Auto-fix markdown validation errors (use with --validate-md)
  --no-watch         Disable _mdsvr/settings.json hot-reload
  -v, --version      Print version
  -h, --help         Print this help
```

## Configuration (`_mdsvr/settings.json`)

Place `_mdsvr/settings.json` in your docs root for full customization:

```json
{
  "$schema": "https://mdsvr.js.org/schema/v2.json",
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
  watchSettings: true, // Auto-reload on _mdsvr/settings.json changes
});

console.log(`Running at ${server.url}`);
console.log(`Settings: ${server.settings.site.title}`);

// Manual settings reload
await server.reloadSettings();

// Graceful shutdown - SIGINT is sent when user presses Ctrl+C
process.on("SIGINT", () => server.close());
```

### Accessing Settings

```typescript
import { loadSettings, validateSettingsFile } from "mdsvr";

// Load settings from directory
const settings = await loadSettings("./docs");

// Validate _mdsvr/settings.json
const result = await validateSettingsFile("./docs");
if (!result.valid) {
  console.error(result.errors);
}

// Export static HTML for hosting
import { exportStaticSite } from "mdsvr";

await exportStaticSite({
  rootDir: "./docs",
  outputDir: "./docs/_html/public",
  settings,
});
```

## CLI: Validate Markdown

Check your markdown files for common issues like broken links, missing front matter, inconsistent heading levels, and more:

```bash
# Validate all markdown files
npx mdsvr ./docs --validate-md

# Validate and auto-fix common errors
npx mdsvr ./docs --validate-md --autofix
```

**Validation checks:**

- Broken internal and external links
- Missing or invalid front matter
- Inconsistent heading hierarchy
- Empty sections or orphaned headings
- Duplicate anchors
- Malformed markdown syntax

## CLI: Export Static Site

Generate a static HTML site for any static hosting (Firebase, Netlify, GitHub Pages, etc.):

```bash
# Export to default _html/public folder
npx mdsvr ./docs --export

# Export to custom directory
npx mdsvr ./docs -e ./dist
```

**Export features:**

- Clean URLs: `/features/markdown-formats/` instead of `/features/markdown-formats.html`
- Auto-generated index pages for directories without README
- Sidebar navigation preserved
- All static assets copied
- Directory listings for folders without index files

## Example: Deploy to Firebase Hosting

### 1. Install Firebase CLI

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Navigate to your docs directory
cd /path/to/your/docs

# Export static HTML to _html/public directory
mdsvr . -e

cd _html

# Login to Firebase
firebase login

# Initialize Firebase Hosting
firebase init hosting
```

When prompted:

- **What do you want to use as your public directory?** `public`
- **Configure as a single-page app?** `n` (No - this is a multi-page static site)

```bash
# Deploy to Firebase
cd _html
firebase deploy
```

**Tip:** Add to your `package.json`:

```json
{
  "scripts": {
    "export": "mdsvr . --export",
    "deploy": "npm run export && cd _html && firebase deploy"
  }
}
```

## Generated Endpoints

When enabled in `_mdsvr/settings.json`:

| Endpoint             | Description                         |
| -------------------- | ----------------------------------- |
| `/sitemap.xml`       | XML sitemap for search engines      |
| `/feed.xml`          | RSS feed for blog posts             |
| `/search-index.json` | Search index for client-side search |

## File Structure

```
docs/
├── _mdsvr/
│   ├── settings.json  # Site configuration (optional)
│   └── export-state.json  # Export state tracking (auto-generated)
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
- **Hidden files**: Files starting with `_` or listed in `_mdsvr/settings.json` are hidden
- **Blocked extensions**: `.env`, `.key`, `.pem`, etc. are blocked by default
- **Read-only**: Server only serves files, no write operations

## Requirements

- Node.js 18+

## Performance

| Tool       | Startup / Build time |
| ---------- | -------------------- |
| **mdsvr**  | **150ms**            |
| Hugo       | ~1s                  |
| MkDocs     | ~3s                  |
| Nextra     | ~6.2s                |
| Docusaurus | ~8.5s                |

mdsvr serves files directly — no build pipeline, no waiting.

## License

MIT
