---
title: SEO
description: Search engine optimization features
date: 2025-01-15
---

# SEO Features

mdsvr includes built-in SEO features to help your documentation rank better in search engines and look great when shared on social media.

## Meta Tags

Every page includes optimized meta tags based on your `_mdsvr/settings.json` and page frontmatter.

### Title Template

```json
{
  "seo": {
    "titleTemplate": "%s | My Docs"
  }
}
```

- `%s` is replaced with the page title
- Example: `Installation | My Docs`
- When `titleTemplate` is **not set**, titles default to `<page title> | <site title>` (or just the page title when `site.title` is empty). Set `titleTemplate: "%s"` to keep bare titles.

### Page-Level Titles

Override the title for individual pages using frontmatter:

```mdx
---
title: Custom Page Title
description: A description for SEO and social sharing
seoTitle: Custom Page Title | Keyword-Rich Suffix
---

# Page Heading

Content...
```

- `title` — used for the `<title>` tag, `og:title`, and `twitter:title`
- `seoTitle` — optional; wins over `title` for SEO output when present
- Without either, the first `#` heading (then the humanized filename) is used

## Meta Descriptions

Every page gets a `<meta name="description">` resolved in this order:

1. `description` in frontmatter
2. The first meaningful paragraph of the page (code blocks, headings, HTML, and nav-like lines are skipped; truncated to ~160 characters)
3. `site.description` as the last fallback

## Open Graph

Open Graph tags ensure your pages look great when shared on Facebook, LinkedIn, and other platforms.

```json
{
  "seo": {
    "defaultImage": "./assets/og-image.png"
  }
}
```

Generated tags:

- `og:title` — Page title
- `og:description` — Page or site description
- `og:type` — `article` for document pages, `website` for the homepage and directory/auto-index pages
- `og:url` — Absolute canonical URL (only when `site.baseUrl` is set)
- `og:site_name` — Site title
- `og:locale` — Derived from `site.language` (`pt-BR` → `pt_BR`)
- `og:image` — Featured image, resolved to an absolute URL against `site.baseUrl` + `generate.basePath` when possible
- `og:image:width` / `og:image:height` — `1200`×`630`, emitted for generated OG images

## OG Image Generation

mdsvr can automatically generate beautiful OG images for every page. This feature is **enabled by default**.

## Enabling/Disabling

```json
{
  "seo": {
    "og": {
      "enabled": true
    }
  }
}
```

Set `enabled: false` to disable automatic OG image generation.

## Customization

```json
{
  "seo": {
    "og": {
      "enabled": true,
      "template": "default",
      "imageFormat": "jpg",
      "generateOnServe": false,
      "fontFamily": "Inter",
      "colors": {
        "background": "#0a0a0f",
        "text": "#ffffff",
        "accent": "#0969da"
      }
    }
  }
}
```

**Options:**

- `enabled`: Enable/disable OG image generation (default: `true`)
- `template`: OG image template to use (default: `"default"`)
- `imageFormat`: Output format - `jpg` or `png` (default: `jpg`)
- `generateOnServe`: Generate OG images on server requests (default: `false`)
- `fontFamily`: Font family for text (default: `Inter`)
- `colors.background`: Background color (default: `#0a0a0f`)
- `colors.text`: Text color (default: `#ffffff`)
- `colors.accent`: Accent color for highlights (default: `#0969da`)

## Output Location

OG images are generated at:

- Static export: `_html/public/assets/og/{path}/index.jpg`
- Live server: `public/assets/og/{path}/index.jpg`

## Caching

OG images are cached and only regenerated when:

- The source markdown file changes
- Settings change (forcing full re-export)
- The export state is deleted
- Using `--force-og` flag during export

See [Export Caching](../02-settings/#export-caching) for details.

## Force Regeneration

To force regenerate all OG images during export:

```bash
npx mdsvr ./docs --export --force-og
```

This bypasses the cache and regenerates all OG images, useful when:

- OG image template changes
- Font files are updated
- You want to refresh all social media preview images

## Custom Images Per Page

```mdx
---
title: My Article
description: Article description
image: ./assets/article-image.png
---
```

## Twitter Cards

Twitter Cards make your links stand out on Twitter/X.

```json
{
  "seo": {
    "twitterCard": "summary_large_image",
    "twitterSite": "@myhandle"
  }
}
```

## Card Types

- `summary` — Small square image + text
- `summary_large_image` — Large featured image (recommended)

Generated tags: `twitter:card`, `twitter:site`, `twitter:title`, `twitter:description`, and `twitter:image`.

## Sitemap

Generate an XML sitemap for search engines.

## Enabling

```json
{
  "seo": {
    "generateSitemap": true
  }
}
```

## Endpoint

Access your sitemap at:

```
https://yoursite.com/sitemap.xml
```

## Sitemap Contents

The sitemap includes:

- All rendered `.md`/`.mdx` pages **and** auto-generated directory index pages
- Canonical trailing-slash URLs, percent-encoded and deduplicated
- `lastmod` from frontmatter `dateModified` (then `date`, then file mtime)
- Change frequency (`weekly`)
- `noindex` pages are excluded

## Absolute URLs required

A sitemap must contain absolute URLs, so behavior depends on `site.baseUrl`:

- **Export**: `sitemap.xml` is only written when `site.baseUrl` is configured — otherwise generation is skipped with a warning.
- **Serve mode**: `/sitemap.xml` uses `site.baseUrl` when set, otherwise the actual request origin (e.g. `http://localhost:1800`).

## Example Output

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://docs.example.com/</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>weekly</changefreq>
  </url>
  <url>
    <loc>https://docs.example.com/configuration/</loc>
    <lastmod>2025-01-10</lastmod>
    <changefreq>weekly</changefreq>
  </url>
</urlset>
```

## RSS Feed

Generate an RSS feed for blog posts or changelogs.

## Enabling

```json
{
  "seo": {
    "generateRssFeed": true,
    "rss": {
      "title": "My Docs Updates",
      "feedUrl": "/feed.xml",
      "siteUrl": "https://docs.example.com"
    }
  }
}
```

## Endpoint

Access the feed at:

```
https://yoursite.com/feed.xml
```

## Including Posts

Pages are included in the RSS feed when they have a `date` in their frontmatter:

```mdx
---
title: New Feature Released
description: We just shipped a great new feature
date: 2025-01-15
---

# New Feature Released

Content...
```

Posts are sorted by date (newest first) and limited to the 20 most recent entries.

## Canonical URLs

Canonical URLs help search engines understand the primary version of a page.

```json
{
  "site": {
    "baseUrl": "https://docs.example.com"
  }
}
```

With `baseUrl` set, every page includes an absolute canonical in the canonical trailing-slash form (`baseUrl` + `generate.basePath` + page URL):

```html
<link rel="canonical" href="https://docs.example.com/page-path/" />
```

The same absolute URL is used for `og:url` and JSON-LD. When `baseUrl` is **not** configured, `canonical` and `og:url` are omitted entirely — relative canonicals are never emitted.

## No-Index

Prevent specific pages from being indexed:

## Site-Wide

```json
{
  "seo": {
    "noIndex": true
  }
}
```

## Per Page

```mdx
---
noindex: true
---

# Draft Page

This page won't be indexed by search engines.
```

This adds:

```html
<meta name="robots" content="noindex, nofollow" />
```

- `noindex` is the canonical spelling; the older `noIndex` alias still works (`noindex` wins if both are set)
- `noindex` pages are also excluded from `sitemap.xml`

## Directory Listing Pages

Auto-generated index pages for directories without a `README.md`/`index.md` are `website`-type pages with a humanized title and a `Directory listing for …` description. To keep them out of search results, set:

```json
{
  "seo": {
    "noIndexDirectoryPages": true
  }
}
```

They then emit `noindex, nofollow` and are excluded from `sitemap.xml`.

## robots.txt

By default, mdsvr exports a permissive `robots.txt` for static sites:

```
User-agent: *
Allow: /
Sitemap: https://docs.example.com/sitemap.xml
```

Place a non-empty `robots.txt` in your docs root to override the generated file:

```
docs/
├── robots.txt
├── README.md
└── ...
```

To keep `robots.txt` entirely under your own control, disable generation:

```json
{
  "seo": {
    "generateRobotsTxt": false
  }
}
```

Example custom `robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://docs.example.com/sitemap.xml
```

The generated `Sitemap:` line is only included when an absolute sitemap URL can be derived (`site.baseUrl`, or the request origin in serve mode) — relative `Sitemap:` URLs are invalid.

## Structured Data (JSON-LD)

Every page emits one `<script type="application/ld+json">` block with a schema.org `@graph`:

- **Document pages** → `Article` (`headline`, `description`, `url`, `image`, `author`, `datePublished`, `dateModified` — only fields with real data, never invented)
- **Homepage** → `WebSite` (`name`, `url`, `description`)
- **Nested routes** → `BreadcrumbList` when breadcrumbs are enabled (built from the route path and sidebar titles)

Disable with:

```json
{
  "seo": {
    "structuredData": false
  }
}
```

## Author & dates

Article metadata comes from frontmatter and site settings:

```mdx
---
title: My Article
author: Jane Doe # string, or { name: "Jane", url: "https://..." }
date: 2026-10-01 # treated as datePublished
datePublished: 2026-09-30 # wins over `date` when set
dateModified: 2026-10-04
---
```

A site-wide default author can be configured and emits `<meta name="author">` plus JSON-LD `author` (as an `Organization`):

```json
{
  "site": {
    "author": { "name": "Acme Docs Team", "url": "https://acme.example/about" }
  }
}
```

Frontmatter `author` (a `Person`) wins over `site.author`.

## Deployment

## Firebase Hosting

The export works with zero special configuration — point `public` at the output directory:

```json
{
  "hosting": {
    "public": "dist",
    "cleanUrls": true,
    "trailingSlash": true
  }
}
```

Set `site.baseUrl` to your public origin so canonical URLs, `og:url`, `sitemap.xml`, and the `robots.txt` `Sitemap:` line are absolute.

## GitHub Pages

For `https://<user>.github.io/<repo>/` project sites, set both `baseUrl` and `basePath`:

```json
{
  "site": {
    "baseUrl": "https://user.github.io"
  },
  "generate": {
    "basePath": "/repo"
  }
}
```

All generated links, canonicals, sitemap entries, and `og:image` URLs are prefixed with `basePath` automatically.

## Social Sharing Preview

To get the best social sharing previews:

1. **Set a default image** in `_mdsvr/settings.json`
2. **Use custom images** for important pages
3. **Write good descriptions** in frontmatter
4. **Keep titles concise** (under 60 characters)

## Recommended Image Sizes

- **Open Graph**: 1200×630 pixels
- **Twitter Cards**: 1200×600 pixels (large image)

## Complete SEO Configuration

```json
{
  "site": {
    "title": "My Documentation",
    "description": "Comprehensive documentation for My Project",
    "baseUrl": "https://docs.example.com",
    "language": "en",
    "author": { "name": "Acme Docs Team", "url": "https://acme.example" }
  },
  "seo": {
    "titleTemplate": "%s | My Docs",
    "defaultImage": "./assets/og-default.png",
    "twitterCard": "summary_large_image",
    "twitterSite": "@myhandle",
    "noIndex": false,
    "generateSitemap": true,
    "generateRobotsTxt": true,
    "generateRssFeed": true,
    "structuredData": true,
    "rss": {
      "title": "My Docs Blog",
      "feedUrl": "/feed.xml",
      "siteUrl": "https://docs.example.com"
    }
  }
}
```

## Testing

Test your SEO implementation with these tools:

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
