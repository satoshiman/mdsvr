---
title: Configuration
description: Configure your mdsvr documentation site with settings.json
---

# Configuration

mdsvr can be configured via a `settings.json` file in your docs root directory. All settings are optional — the server works out of the box with sensible defaults.

## Creating settings.json

Use the CLI to create a starter configuration:

```bash
npx mdsvr ./docs --init
```

Or create it manually:

```json
{
  "$schema": "https://raw.githubusercontent.com/satoshiman/mdsvr/main/schema/v2.json",
  "site": {
    "title": "My Docs",
    "description": "Project documentation"
  }
}
```

## Site Settings

```json
{
  "site": {
    "title": "My Documentation",
    "description": "A great documentation site",
    "baseUrl": "https://docs.example.com",
    "language": "en",
    "logo": {
      "src": "./assets/logo.svg",
      "alt": "My Project",
      "href": "/"
    },
    "favicon": "./assets/favicon.ico"
  }
}
```

## Appearance

Control the look and feel of your documentation:

```json
{
  "appearance": {
    "defaultTheme": "system",
    "allowThemeToggle": true,
    "accentColor": "#0969da",
    "codeTheme": {
      "light": "lightfair",
      "dark": "github-dark"
    }
  }
}
```

### Theme Options

- `defaultTheme`: `"light"`, `"dark"`, or `"system"` (follows OS preference)
- `allowThemeToggle`: Show/hide the theme toggle button in the header
- `accentColor`: Primary color for links, buttons, and accents

## Navigation

Configure the sidebar, breadcrumbs, and table of contents:

```json
{
  "navigation": {
    "sidebar": {
      "enabled": true,
      "autoGenerate": true,
      "collapsible": true,
      "defaultOpen": true
    },
    "breadcrumbs": true,
    "prevNextLinks": true,
    "tocEnabled": true,
    "tocMaxDepth": 3
  }
}
```

## Search

Enable and configure the built-in search:

```json
{
  "search": {
    "enabled": true,
    "placeholder": "Search docs...",
    "maxResults": 10
  }
}
```

Press `⌘+K` (or `Ctrl+K`) to open the search modal.

## SEO

Configure search engine optimization features:

```json
{
  "seo": {
    "titleTemplate": "%s | My Docs",
    "defaultImage": "./assets/og-image.png",
    "twitterCard": "summary_large_image",
    "twitterSite": "@myhandle",
    "generateSitemap": true,
    "generateRssFeed": true,
    "rss": {
      "title": "My Docs Updates",
      "feedUrl": "/feed.xml",
      "siteUrl": "https://docs.example.com"
    }
  }
}
```

When enabled, these endpoints are automatically generated:

- `/sitemap.xml` — XML sitemap for search engines
- `/feed.xml` — RSS feed for blog posts (files with `date` in frontmatter)

## MDX

Enable MDX support and configure available components:

```json
{
  "mdx": {
    "enabled": true,
    "components": {
      "Callout": true,
      "CodeGroup": true,
      "Steps": true,
      "Card": true,
      "CardGroup": true,
      "Tabs": true,
      "Accordion": true,
      "Badge": true,
      "Mermaid": true
    }
  }
}
```

## Files

Control which files are served, blocked, or hidden:

```json
{
  "files": {
    "extensions": {
      "serve": [".md", ".mdx", ".png", ".jpg", ".svg", ".css", ".js"],
      "block": [".env", ".key", ".pem"],
      "hidden": ["settings.json", ".git", "node_modules"]
    },
    "indexFiles": ["README.md", "index.md", "index.html"],
    "ignorePatterns": ["**/node_modules/**", "**/.git/**"]
  }
}
```

- Files starting with `_` are automatically hidden
- Blocked extensions return 403 Forbidden
- Hidden files return 404 Not Found (as if they don't exist)

## Footer

Customize the site footer:

```json
{
  "footer": {
    "text": "Built with mdsvr",
    "links": [
      { "label": "GitHub", "href": "https://github.com/..." },
      { "label": "Twitter", "href": "https://twitter.com/..." }
    ]
  }
}
```

## Hot Reload

Settings are automatically reloaded when `settings.json` changes (except when using `--no-watch` flag). You'll see a message in the console:

```
[mdsvr] Settings reloaded
```

## Validation

Validate your settings.json:

```bash
npx mdsvr ./docs --validate
```

This will check your configuration and report any errors.

## Complete Example

Here's a complete `settings.json` with all available options:

```json
{
  "$schema": "https://raw.githubusercontent.com/satoshiman/mdsvr/main/schema/v2.json",
  "site": {
    "title": "My Docs",
    "description": "Project documentation",
    "baseUrl": "https://docs.example.com",
    "language": "en",
    "logo": {
      "src": "./assets/logo.svg",
      "alt": "My Project",
      "href": "/"
    },
    "favicon": "./assets/favicon.ico"
  },
  "appearance": {
    "defaultTheme": "system",
    "allowThemeToggle": true,
    "accentColor": "#0969da"
  },
  "navigation": {
    "sidebar": {
      "enabled": true,
      "autoGenerate": true,
      "collapsible": true,
      "defaultOpen": true
    },
    "breadcrumbs": true,
    "prevNextLinks": true,
    "tocEnabled": true,
    "tocMaxDepth": 3
  },
  "search": {
    "enabled": true,
    "placeholder": "Search docs...",
    "maxResults": 10
  },
  "seo": {
    "titleTemplate": "%s | My Docs",
    "defaultImage": "./assets/og-default.png",
    "twitterCard": "summary_large_image",
    "generateSitemap": true,
    "generateRssFeed": false
  },
  "files": {
    "extensions": {
      "serve": [
        ".md",
        ".mdx",
        ".txt",
        ".pdf",
        ".png",
        ".jpg",
        ".svg",
        ".css",
        ".js",
        ".json"
      ],
      "block": [".env", ".key", ".pem", ".p12"],
      "hidden": ["settings.json", ".git", "node_modules", ".DS_Store"]
    },
    "indexFiles": ["README.md", "index.md", "INDEX.md"]
  },
  "mdx": {
    "enabled": true,
    "components": {
      "Callout": true,
      "CodeGroup": true,
      "Steps": true,
      "Card": true,
      "CardGroup": true,
      "Tabs": true,
      "Accordion": true,
      "Badge": true,
      "Mermaid": true
    }
  },
  "footer": {
    "text": "Built with mdsvr",
    "links": [{ "label": "GitHub", "href": "https://github.com/..." }]
  }
}
```
