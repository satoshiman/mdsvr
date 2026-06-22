---
title: Welcome
description: Full-featured documentation website server with MDX support, site settings, SEO, and navigation
---

# Welcome to mdsvr

Transform any folder of Markdown/Markdown files into a beautiful documentation website — zero config required.

```bash
npx mdsvr ./docs
```

> ℹ️ **Info:** This documentation itself is served by **mdsvr**! Explore the files in this directory to see how everything works.

## What is mdsvr?

**mdsvr** is a static file server that automatically renders Markdown and MDX files as beautiful HTML. It's similar to Vercel's `serve` but understands `.md` and `.mdx` files.

## Quick Start

1. **Install**

   No installation needed! Just use `npx`:

   ```bash
   npx mdsvr ./docs
   ```

2. **Create your docs**

   Create a folder with some `.md` files:

   ```bash
   mkdir docs
   echo "# Hello World" > docs/readme.md
   ```

3. **Start the server**

   ```bash
   npx mdsvr ./docs --open
   ```

## Key Features

| Feature                                  | Description                                                    |
| ---------------------------------------- | -------------------------------------------------------------- |
| 📝 [Markdown & MDX](/3.-features)        | Render .md and .mdx files with built-in interactive components |
| 🎨 [Themes](/3.-features/theming)        | Dark/light mode with customizable accent colors                |
| 🔍 [Search](/3.-features/search)         | Built-in full-text search with keyboard shortcut (⌘K)          |
| 📑 [Navigation](/3.-features/navigation) | Auto-generated sidebar and table of contents                   |
| 🔎 [SEO](/3.-features/seo)               | Sitemap, RSS feed, Open Graph, and Twitter Cards               |
| ⚙️ [Settings](/2.-settings)              | Configure everything via settings.json                         |

## This docs structure for reference

```
docs/
├── settings.json                # Site configuration (optional)
├── README.md                    # Homepage (this file)
├── 1.-getting-started/          # Getting started guides
│   └── README.md              # Quick start & installation
├── 2.-settings/                 # Settings & configuration
│   └── README.md              # Configuration, writing & deployment
├── 3.-features/                 # Feature documentation
│   ├── README.md             # Features overview
│   ├── markdown.md           # Markdown support
│   ├── mdx.mdx               # MDX components demo
│   ├── theming.md            # Theme customization
│   ├── search.md             # Search functionality
│   ├── navigation.md         # Navigation features
│   ├── seo.md                # SEO features
│   └── mermaid.md            # Mermaid diagrams
└── 4.-reference/                # API/Reference
    └── README.md             # CLI reference
```

## Next Steps

- **[Quick Start](/1.-getting-started)** — Get running in 30 seconds
- **[Installation](/1.-getting-started)** — Install options
- **[MDX Components](/3.-features/mdx)** — Make your docs interactive
- **[Configuration](/2.-settings)** — Customize your site
- **[Writing Content](/2.-settings)** — Best practices
- **[Deployment](/2.-settings)** — Go live
- **[Features](/3.-features)** — See all features
- **[CLI Reference](/4.-reference)** — Command reference

---

> 💡 **Tip:** Press `⌘+K` (or `Ctrl+K`) to open the search modal and find anything in this documentation!
