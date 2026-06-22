---
title: Search
description: Full-text search for your documentation
---

# Search

mdsvr includes a **built-in full-text search** that works entirely client-side. No external services or databases required.

## Enabling Search

Search is enabled by default. Configure it in `settings.json`:

```json
{
  "search": {
    "enabled": true,
    "placeholder": "Search docs...",
    "maxResults": 10
  }
}
```

## Using Search

### Keyboard Shortcut

Press `⌘+K` (Mac) or `Ctrl+K` (Windows/Linux) to open the search modal from anywhere.

### Search Trigger

Click the search icon in the header to open the search modal.

### Search Modal

The search modal includes:
- **Instant results** as you type
- **Fuzzy matching** for typo tolerance
- **Result highlighting** with matching terms marked
- **Keyboard navigation** with ↑/↓ arrows
- **Quick selection** with Enter key

## How It Works

1. **Index Generation**: When the server starts, it crawls all `.md` and `.mdx` files and builds a search index
2. **JSON Endpoint**: The index is served at `/search-index.json`
3. **Client-Side Search**: A lightweight (~3KB) JavaScript library performs fuzzy matching in the browser
4. **No Server Load**: All search processing happens on the client

## Search Index

The search index includes:
- **Title** — Page titles (highest weight)
- **Headings** — All H1-H6 headings
- **Content** — Full text content (stripped of markdown)
- **Excerpt** — First 200 characters for previews

## Scoring

Results are ranked by relevance:

| Match Type | Score |
|------------|-------|
| Exact title match | +100 |
| Title starts with query | +50 |
| Title contains query | +25 |
| Heading contains query | +15 |
| Content contains query | +10 |

## Disabling Search

To disable search entirely:

```json
{
  "search": {
    "enabled": false
  }
}
```

This will:
- Hide the search trigger in the header
- Remove the ⌘K keyboard shortcut
- Skip building the search index at startup
- Return empty array at `/search-index.json`

## Search Data Structure

Each entry in the search index:

```typescript
{
  title: string;      // Page title
  href: string;       // URL path
  excerpt: string;    // First 200 chars
  headings: string[]; // All H1-H6 text
  content: string;    // Full plain text
}
```

## Tips for Better Search

1. **Use descriptive titles** — They have the highest search weight
2. **Use headings** — They help users find specific sections
3. **Frontmatter title** — Set `title:` in frontmatter for better control

Example:
```mdx
---
title: Authentication Guide
---

# Authentication

## JWT Tokens

How to use JWT tokens for authentication...

## OAuth

Setting up OAuth providers...
```

## Accessibility

The search modal is fully accessible:
- Keyboard navigation (Tab, Arrow keys, Enter, Escape)
- ARIA labels for screen readers
- Focus trap while modal is open
- Focus restoration when closed

## Performance

- Search index is generated **once at server startup**
- Index is cached and served as static JSON
- Fuzzy matching uses a lightweight algorithm
- No external dependencies (no Algolia, Elasticsearch, etc.)

For large documentation sites (1000+ pages), the index generation and search performance remain fast.
