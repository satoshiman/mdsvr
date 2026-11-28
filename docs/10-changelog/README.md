---
title: Changelog
description: Release notes and version history for mdsvr
---

# Changelog

All notable changes to mdsvr are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [semantic versioning](https://semver.org).

## [2.8.1] - 2026-11-28

### Fixed

- **Quiz blocks: inline math not rendered.** `$...$` expressions inside ` ```quiz ` questions, options, explanations and self-check answers displayed as raw source. The quiz inline renderer now loads the KaTeX plugin, matching body content on both `.md` and `.mdx` pages.
- **Static export: sidebar did not highlight the current page.** Exported pages passed the slash-less URL form to the sidebar, so only the parent folder was marked `active` while the current leaf item received no `active` or `has-active-child` classes.
- **Local images 404 on the dev server with relative paths.** The dev server only rebased relative links when `generate.cleanUrls` was on, so `../assets/x.png` resolved one level too deep under canonical trailing-slash page URLs. Relative links and asset paths are now rebased to canonical site-relative routes in both serve and export modes.
- **Validator rejected root-absolute asset paths.** `![img](/assets/x.png)` failed `--validate-md` with `absolute-path` even though the file exists and export already resolves it under the docs root. Root-absolute asset paths now validate against the docs root: existing targets pass, missing ones report `missing-asset`, and paths escaping the root report `outside-root`.
- **"On this page" TOC dropped headings containing inline markup.** TOC extraction required heading content with no inner tags, so headings containing math, code or emphasis were skipped — and every `.mdx` heading was missing because the autolink anchor adds a tag. The TOC also rendered empty when the page's shallowest heading was deeper than H1.
- **MDX: interactive components were dead markup.** `<Accordion>` and `<Tabs>` relied on React state, which never runs after `renderToStaticMarkup` — accordion content was never emitted and only the first tab panel existed in the HTML. Accordions now render native `<details>/<summary>`, and tabs render every panel with switching handled by a delegated click handler.
- **MDX: an unknown or failing component 500'd the page.** An unregistered JSX component threw during render, taking down the whole page (and aborting export). Pages now render an inline "MDX render error" callout instead, matching the broken-quiz contract.
- **MDX: code blocks, tables and callouts diverged from `.md`.** `.mdx` fenced blocks rendered bare `<pre><code>` without syntax highlighting or the copy/wrap/fullscreen toolbar, tables missed the scrollable wrapper, and `> [!NOTE]` callouts stayed plain blockquotes.
- **Link cards looked like ordinary links.** `<Card href>` anchors inherited the accent link color and underlined all card content on hover. Link cards now keep body text colors, never underline, and highlight the border and title on hover.
- **`<Tab>` component is now registered.** The documented `<Tab>` wrapper inside `<Tabs>` previously threw "Expected component `Tab` to be defined"; it now works as a panel marker.

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
