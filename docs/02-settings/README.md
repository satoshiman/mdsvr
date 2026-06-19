---
title: Guides
description: Detailed guides for configuring, writing, and deploying your mdsvr documentation
---

# Guides

In-depth guides for configuring, writing, and deploying your documentation.

---

## Configuration

mdsvr can be configured via a `settings.json` file in your docs root directory. All settings are optional — the server works out of the box with sensible defaults.

### Creating settings.json

Use the CLI to create a starter configuration:

```bash
npx mdsvr . --init
```

Or create it manually:

```json
{
  "$schema": "https://mdsvr.js.org/schema/v2.json",
  "site": {
    "title": "My Docs",
    "description": "Project documentation"
  }
}
```

### Site Settings

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

### Appearance

Control the look and feel of your documentation:

```json
{
  "appearance": {
    "defaultTheme": "system",
    "allowThemeToggle": true,
    "accentColor": "#0969da",
    "codeTheme": {
      "light": "github",
      "dark": "github-dark"
    }
  }
}
```

**Theme Options:**

- `defaultTheme`: `"light"`, `"dark"`, or `"system"` (follows OS preference)
- `allowThemeToggle`: Show/hide the theme toggle button in the header
- `accentColor`: Primary color for links, buttons, and accents

### Navigation

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

### Search

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

### SEO

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

### MDX

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

### Files

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

### Footer

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

### Hot Reload

Settings are automatically reloaded when `settings.json` changes (except when using `--no-watch` flag). You'll see a message in the console:

```
[mdsvr] Settings reloaded
```

### Validation

Validate your settings.json:

```bash
npx mdsvr . --validate
```

This will check your configuration and report any errors.

### Complete Example

Here's a complete `settings.json` with all available options:

```json
{
  "$schema": "https://mdsvr.js.org/schema/v2.json",
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

---

## Writing Content

Tips and best practices for creating great documentation.

### File Organization

```
docs/
├── README.md              # Homepage (required)
├── 1.-getting-started/    # Getting started guides
├── 2.-settings/           # Settings & configuration
├── 3.-features/           # Feature documentation
└── 4.-reference/          # API/reference docs
```

### Frontmatter

Every page should have frontmatter:

```markdown
---
title: Page Title
description: Brief description for SEO
---
```

Optional fields:

```markdown
---
title: Page Title
description: Description
date: 2025-01-15 # For RSS feed
author: John Doe # Attribution
tags: [setup, guide] # For organization
noIndex: true # Exclude from search
---
```

### Markdown Tips

#### Use Descriptive Headings

```markdown
<!-- Good -->

## Installing via npm

<!-- Less clear -->

## Installation
```

#### Cross-Reference Links

Use relative paths:

```markdown
See [configuration guide](/2.-settings/README.md)
```

#### Code Blocks

Always specify language:

````markdown
```javascript
const x = 1;
```
````

### MDX Components

Use components for interactive content:

```mdx
<Callout type="warning">Important information here</Callout>

<Steps>
  ### Step 1
  First step content

### Step 2

Second step content

</Steps>
```

See [MDX Components](../3.-features/mdx.mdx) for all available components.

### Images & Assets

Place assets in `docs/assets/`:

```markdown
![Alt text](/assets/screenshot.png)
```

### Best Practices

1. **Start with a README.md** — Required for homepage
2. **Use descriptive filenames** — `quickstart.md` not `page1.md`
3. **Keep pages focused** — One topic per page
4. **Link liberally** — Help users navigate
5. **Use components** — Callouts for warnings, Steps for procedures

---

## Deployment

Deploy your documentation to any static hosting platform.

### Export Static Site

Generate static HTML files:

```bash
npx mdsvr ./docs --export
```

This creates `_html/public/` with your static site.

#### Custom Output

```bash
npx mdsvr ./docs --export ./dist
```

### Firebase Hosting

```bash
# Export
npx mdsvr ./docs --export

# Deploy
cd _html/public
firebase deploy
```

### Netlify

#### Via CLI

```bash
npx mdsvr ./docs --export
netlify deploy --dir=_html/public --prod
```

#### Via Git

1. Push docs to GitHub
2. Connect repo to Netlify
3. Set build command: `npx mdsvr . --export _html/public`
4. Publish directory: `_html/public`

### Vercel

```bash
# vercel.json
{
  "buildCommand": "npx mdsvr . --export _html/public",
  "outputDirectory": "_html/public"
}
```

### GitHub Pages

```bash
# Export to docs folder
npx mdsvr ./src --export ./docs

# Or use GitHub Actions
```

#### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx mdsr . --export
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./_html/public
```

### Docker

#### Using Pre-built Image

```bash
docker pull thedeployer/mdsvr:latest
docker run -d \
  -p 1800:1800 \
  -v /path/to/docs:/app/docs \
  thedeployer/mdsvr:latest
```

#### Build Your Own

```dockerfile
FROM thedeployer/mdsvr:latest
COPY ./docs /app/docs
```

```bash
docker build -t my-docs .
docker run -d -p 1800:1800 my-docs
```

### VPS / Self-Hosted

Export and serve with any web server:

```bash
# Export
npx mdsvr ./docs --export /var/www/docs

# Nginx config
server {
    listen 80;
    root /var/www/docs;
    try_files $uri $uri/ $uri.html =404;
}
```

### Clean URLs

Exported sites use clean URLs:

- `/guide/setup/` instead of `/guide/setup.html`
- Works on all modern static hosts

---

## Related

- [Getting Started](../1.-getting-started/README.md) — If you're new to mdsvr
- [Features](../3.-features/README.md) — Learn about specific features
- [CLI Reference](../4.-reference/README.md) — Command-line documentation
