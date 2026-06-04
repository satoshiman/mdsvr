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

| Feature                               | Description                                                    |
| ------------------------------------- | -------------------------------------------------------------- |
| 📝 [Markdown & MDX](/features/mdx)    | Render .md and .mdx files with built-in interactive components |
| 🎨 [Themes](/features/theming)        | Dark/light mode with customizable accent colors                |
| 🔍 [Search](/features/search)         | Built-in full-text search with keyboard shortcut (⌘K)          |
| 📑 [Navigation](/features/navigation) | Auto-generated sidebar and table of contents                   |
| 🔎 [SEO](/features/seo)               | Sitemap, RSS feed, Open Graph, and Twitter Cards               |
| ⚙️ [Settings](/configuration)         | Configure everything via settings.json                         |

## Project Structure

```
docs/
├── settings.json      # Site configuration (optional)
├── README.md          # Homepage (this file)
├── features/          # Feature documentation
│   ├── mdx.mdx       # MDX components demo
│   ├── theming.md    # Theme customization
│   ├── search.md     # Search functionality
│   ├── navigation.md # Navigation features
│   └── seo.md        # SEO features
└── configuration.md  # Full configuration guide
```

## Next Steps

- [New] Learn about [MDX Components](/features/mdx) to make your docs interactive
- Learn how to [configure](/configuration) your documentation site
- Check out all the [features](/features) mdsvr offers

---

> 💡 **Tip:** Press `⌘+K` (or `Ctrl+K`) to open the search modal and find anything in this documentation!
