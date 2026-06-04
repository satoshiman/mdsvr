---
title: Navigation
description: Sidebar, breadcrumbs, and table of contents
---

# Navigation

mdsvr provides multiple navigation systems to help users find their way around your documentation.

## Sidebar Navigation

The sidebar is automatically generated from your file structure.

### Enabling the Sidebar

```json
{
  "navigation": {
    "sidebar": {
      "enabled": true,
      "autoGenerate": true,
      "collapsible": true,
      "defaultOpen": true
    }
  }
}
```

### How It Works

- **Folders** become collapsible groups
- **Files** become links
- **Hidden files** (starting with `_`) are excluded
- **Sort order**: Folders first, then files (alphabetically)

### Page Titles

Titles are determined by (in priority order):

1. `title` in frontmatter
2. First H1 heading in the file
3. Filename (humanized)

```mdx
---
title: Custom Page Title
---

# This heading is used if no frontmatter title

Content...
```

### Active State

The current page is highlighted in the sidebar. Parent folders are also marked as active when viewing nested pages.

## Breadcrumbs

Breadcrumbs show the current location in the documentation hierarchy.

```json
{
  "navigation": {
    "breadcrumbs": true
  }
}
```

Example breadcrumb:
```
Home / Features / Navigation
```

## Table of Contents

The TOC (right sidebar) shows headings from the current page.

```json
{
  "navigation": {
    "tocEnabled": true,
    "tocMaxDepth": 3
  }
}
```

### Max Depth

Control how many heading levels to show:
- `tocMaxDepth: 2` — Show H2 only
- `tocMaxDepth: 3` — Show H2 and H3 (default)
- `tocMaxDepth: 6` — Show all headings

### Smooth Scrolling

Clicking a TOC link smoothly scrolls to the heading with a subtle highlight effect.

## Previous/Next Links

Navigate between pages with previous/next links at the bottom of each page.

```json
{
  "navigation": {
    "prevNextLinks": true
  }
}
```

The links follow the sidebar order, making it easy to read through documentation sequentially.

## File Structure Example

Given this file structure:

```
docs/
├── README.md
├── getting-started/
│   ├── installation.md
│   └── quickstart.md
├── features/
│   ├── mdx.mdx
│   ├── theming.md
│   └── search.md
└── configuration.md
```

The sidebar will show:

- Home (README.md)
- Getting Started (folder)
  - Installation
  - Quickstart
- Features (folder)
  - MDX Components
  - Theming
  - Search
- Configuration

## Hidden Files

Hide files from the sidebar by:

1. **Prefix with underscore**: `_draft.md`
2. **Add to settings.json**:
   ```json
   {
     "files": {
       "extensions": {
         "hidden": ["draft.md", "*.tmp"]
       }
     }
   }
   ```

Hidden files are also excluded from:
- Search index
- Sitemap
- RSS feed
- Directory listings

## Customizing Order

Currently, files are sorted alphabetically. Manual ordering via `frontmatter.order` is planned for a future release.

## Responsive Design

Navigation adapts to different screen sizes:

| Breakpoint | Behavior |
|------------|----------|
| Desktop (>1024px) | Sidebar + TOC visible |
| Tablet (768-1024px) | Sidebar visible, TOC hidden |
| Mobile (<768px) | Sidebar becomes overlay menu |

### Mobile Navigation

On mobile devices:
- The sidebar is hidden by default
- A hamburger menu button appears in the header
- Clicking the menu opens the sidebar as an overlay
- The overlay can be closed by clicking outside or the X button

## Accessibility

All navigation features are keyboard accessible:

- **Tab**: Navigate between links
- **Enter**: Activate links
- **Space**: Toggle collapsible sections
- **Escape**: Close mobile sidebar or search modal

ARIA labels are included for screen readers:
- `aria-current="page"` on active links
- `aria-expanded` on collapsible sections
- `aria-label` on navigation landmarks

## Complete Configuration

```json
{
  "navigation": {
    "sidebar": {
      "enabled": true,
      "autoGenerate": true,
      "showFileCount": false,
      "collapsible": true,
      "defaultOpen": true
    },
    "breadcrumbs": true,
    "prevNextLinks": true,
    "tocEnabled": true,
    "tocMaxDepth": 3,
    "editOnGithub": {
      "enabled": false,
      "repo": "https://github.com/user/repo",
      "branch": "main",
      "docsDir": "docs/"
    }
  }
}
```
