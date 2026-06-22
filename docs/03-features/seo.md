---
title: SEO
description: Search engine optimization features
date: 2025-01-15
---

# SEO Features

mdsvr includes built-in SEO features to help your documentation rank better in search engines and look great when shared on social media.

## Meta Tags

Every page includes optimized meta tags based on your `settings.json` and page frontmatter.

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

### Page-Level Titles

Override the title for individual pages using frontmatter:

```mdx
---
title: Custom Page Title
description: A description for SEO and social sharing
---

# Page Heading

Content...
```

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
- `og:type` — `website` or `article`
- `og:url` — Canonical URL
- `og:image` — Featured image

## OG Image Generation

mdsvr can automatically generate beautiful OG images for every page. This feature is **enabled by default**.

### Enabling/Disabling

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

### Customization

```json
{
  "seo": {
    "og": {
      "enabled": true,
      "imageFormat": "jpg",
      "fontFamily": "Inter",
      "colors": {
        "background": "#0a0a0f",
        "text": "#ffffff"
      }
    }
  }
}
```

**Options:**

- `enabled`: Enable/disable OG image generation (default: `true`)
- `imageFormat`: Output format - `jpg` or `png` (default: `jpg`)
- `fontFamily`: Font family for text (default: `Inter`)
- `colors.background`: Background color (default: `#0a0a0f`)
- `colors.text`: Text color (default: `#ffffff`)

### Output Location

OG images are generated at:

- Static export: `_html/public/og/{path}/index.jpg`
- Live server: `public/og/{path}/index.jpg`

### Caching

OG images are cached and only regenerated when:

- The source markdown file changes
- Settings change (forcing full re-export)
- The export state is deleted

See [Export Caching](../2.-settings/README.md#export-caching) for details.

### Custom Images Per Page

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

### Card Types

- `summary` — Small square image + text
- `summary_large_image` — Large featured image (recommended)

## Sitemap

Generate an XML sitemap for search engines.

### Enabling

```json
{
  "seo": {
    "generateSitemap": true
  }
}
```

### Endpoint

Access your sitemap at:

```
https://yoursite.com/sitemap.xml
```

### Sitemap Contents

The sitemap includes:

- All `.md` and `.mdx` files
- Last modified date (from file mtime or frontmatter `date`)
- Change frequency (`weekly`)

### Example Output

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://docs.example.com/</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>weekly</changefreq>
  </url>
  <url>
    <loc>https://docs.example.com/configuration</loc>
    <lastmod>2025-01-10</lastmod>
    <changefreq>weekly</changefreq>
  </url>
</urlset>
```

## RSS Feed

Generate an RSS feed for blog posts or changelogs.

### Enabling

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

### Endpoint

Access the feed at:

```
https://yoursite.com/feed.xml
```

### Including Posts

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

With `baseUrl` set, every page includes:

```html
<link rel="canonical" href="https://docs.example.com/page-path" />
```

## No-Index

Prevent specific pages from being indexed:

### Site-Wide

```json
{
  "seo": {
    "noIndex": true
  }
}
```

### Per Page

```mdx
---
noIndex: true
---

# Draft Page

This page won't be indexed by search engines.
```

This adds:

```html
<meta name="robots" content="noindex" />
```

## robots.txt

While mdsvr doesn't generate `robots.txt` automatically, you can create one in your docs root:

```
docs/
├── robots.txt
├── README.md
└── ...
```

Example `robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://docs.example.com/sitemap.xml
```

## Social Sharing Preview

To get the best social sharing previews:

1. **Set a default image** in `settings.json`
2. **Use custom images** for important pages
3. **Write good descriptions** in frontmatter
4. **Keep titles concise** (under 60 characters)

### Recommended Image Sizes

- **Open Graph**: 1200×630 pixels
- **Twitter Cards**: 1200×600 pixels (large image)

## Complete SEO Configuration

```json
{
  "site": {
    "title": "My Documentation",
    "description": "Comprehensive documentation for My Project",
    "baseUrl": "https://docs.example.com",
    "language": "en"
  },
  "seo": {
    "titleTemplate": "%s | My Docs",
    "defaultImage": "./assets/og-default.png",
    "twitterCard": "summary_large_image",
    "twitterSite": "@myhandle",
    "noIndex": false,
    "generateSitemap": true,
    "generateRssFeed": true,
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
