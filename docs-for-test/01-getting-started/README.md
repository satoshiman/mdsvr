---
title: Getting Started
description: Get up and running with mdsvr - installation and quick start guide
---

# Getting Started

New to mdsvr? Start here to get up and running in minutes.

## Quick Start

Get your documentation site running in under 30 seconds.

### One-Command Setup

```bash
npx mdsvr ./docs --open
```

That's it! No configuration needed, no build step required.

### Step-by-Step

#### 1. Create a Docs Folder

```bash
mkdir docs
echo "# Hello World" > docs/README.md
```

#### 2. Start the Server

```bash
npx mdsvr ./docs --open
```

The `--open` flag automatically opens your browser to `http://localhost:1800`.

### What Just Happened?

mdsvr:

1. Scanned your `docs/` folder
2. Found `README.md` and rendered it as your homepage
3. Generated navigation from your folder structure (sorted alphabetically)
4. Started a server on port 1800

---

## Installation

mdsvr requires **Node.js 18+**. Check your version:

```bash
node --version
```

### Option 1: npx (Recommended)

No installation needed. Run directly:

```bash
npx mdsvr ./docs
```

### Option 2: Global Install

Install once, use anywhere:

```bash
npm install -g mdsvr
mdsvr ./docs
```

### Option 3: Local Install

Add to a specific project:

```bash
npm install --save-dev mdsvr
```

Then add to your `package.json`:

```json
{
  "scripts": {
    "docs": "mdsvr ./docs --open"
  }
}
```

Run with:

```bash
npm run docs
```

### Verify Installation

```bash
mdsvr --version
```

### Docker

Pull and run:

```bash
docker pull thedeployer/mdsvr:latest
docker run -d -p 1800:1800 -v /path/to/docs:/app/docs thedeployer/mdsvr:latest
```

See [Docker deployment](../2.-settings/README.md#docker) for more details.

---

## Next Steps

- Learn about [MDX components](../3.-features/mdx.mdx) for interactive docs
- [Configure](../2.-settings/README.md) your site with `settings.json`
- See all [features](../3.-features) mdsvr offers
