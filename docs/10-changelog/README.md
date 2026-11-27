---
title: Changelog
description: Release notes and version history for mdsvr
---

# Changelog

All notable changes to mdsvr are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [semantic versioning](https://semver.org).

## [2.8.0] - 2026-11-27

### Changed

- **Header and sidebar redesigned.** The header is now translucent with a backdrop blur and uses SVG icon buttons instead of `☰` and emoji glyphs. The site title renders as a monogram mark plus a two-tone `Name / Tagline` pair split on `|`, and search opens from a `⌘K` pill that shows the configured placeholder. The sidebar drops emoji folder icons for chevron-left disclosure rows with `aria-expanded`, animates expand and collapse, aligns nested items under a tree guide, and marks the active page with a soft accent pill while ancestor sections show accent text only. On mobile the sidebar becomes an overlay drawer with tap-outside dismissal, and all new motion honors `prefers-reduced-motion`.
- **Mermaid diagrams render server-side via Pele.** ` ```mermaid ` blocks and the MDX `<Mermaid>` component now compile to SVG at serve/export time using [Pele](https://pele.run), replacing the mermaid.js CDN bundle. Diagrams follow the site theme through CSS variables, so light/dark switching no longer requires a client re-render, and pages ship no client-side diagram library.
- **Hidden file patterns support glob-style `*`.** `files.extensions.hidden` patterns now match `*` in any position (e.g. `package*.json`), not only as a leading wildcard.

### Fixed

- **Static export missing `basePath` on content links.** Relative links and assets inside markdown pages rendered to site-relative routes like `/route/` without `generate.basePath`, breaking deployments under a subpath. Directory auto-index listings had the same gap.
- **Hidden files served from dot-directories.** The hidden-file check only inspected the basename, so files inside directories like `.github/` or `.hidden/` were still served. Every path segment is now checked, and `package*.json` is blocked by default.
- **Validator counted headings inside fenced code blocks.** A `# comment` inside a ` ```bash ` block was treated as an H1, producing false "multiple H1" and heading-hierarchy errors. The validator and the search index now skip fenced code regions.
- **OG image path collision with `basePath`-named directories.** OG helpers stripped the `basePath` prefix from a site-relative path that never contained it, so a docs directory sharing the basePath name could lose its first segment and share an OG image with another page.

## Earlier versions

See the [git history](https://github.com/satoshiman/mdsvr/commits/main) and [releases](https://github.com/satoshiman/mdsvr/releases) for changes before 2.8.0.
