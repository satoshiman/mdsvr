# SEO Audit — mdsvr (verified against production)

- **Date:** 2026-10-04
- **Audited version:** mdsvr 2.4.1 (published package, same code as local repo HEAD `cc08fc8`)
- **Audited site:** https://vuong-docs.web.app/ (docs source: `/Users/apple/vuong-docs`, deployed via Firebase Hosting with `cleanUrls: true`, `trailingSlash: true`)
- **Method:** Fetched all 328 sitemap URLs + `robots.txt` + `sitemap.xml` from production with curl; parsed every `<head>`; cross-checked canonicals, JSON-LD, internal links, and duplicate content against the actual served DOM. No code was modified.

## Overall Score: 81/100

| Category               | Score | Evidence-based deductions                                                                                                                                 |
| ---------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technical crawlability | 19/20 | Fully static HTML, correct 404s/redirects, HTTPS+HSTS. −1: 29 pages ship malformed nested documents                                                       |
| Metadata               | 11/15 | Complete coverage & unique titles. −4: 49 pages share fallback description, degenerate descriptions (`"Làm gì:"`), markdown remnants, 34 over-long titles |
| Canonicalization       | 9/10  | 328/328 canonicals exact + host-level 301s. −1: all internal nav links point to the non-canonical no-slash form                                           |
| Sitemap/robots         | 14/15 | Valid, complete, consistent. −1: every `lastmod` is the deploy date (CI checkout mtime)                                                                   |
| Structured data        | 9/10  | Valid JSON-LD on all 328 pages, honest fields. −1: minimal Article schema (no author/date — correctly omits fake data)                                    |
| Internal linking       | 4/10  | **216 unique broken link targets (~29% of internal page targets), 0 orphans**                                                                             |
| URL quality            | 5/5   | Clean, consistent, all variants collapse to canonical                                                                                                     |
| HTML quality           | 2/5   | Nested HTML documents, invalid `<pre><div>` nesting, `lang="en"` on Vietnamese content, multi-H1 pages                                                    |
| Image SEO              | 4/5   | Per-page generated OG images work; 7/52 content images missing alt, none have dimensions, no favicon                                                      |
| Performance-related    | 4/5   | Median page 176 KB (inlined CSS+sidebar), duplicated code blocks                                                                                          |

## Executive Summary

- Canonicals, sitemap, robots.txt, JSON-LD, OG, and Twitter metadata are **correctly implemented and verified on production** — 328/328 pages pass.
- The site is genuinely static: full document content (headings, paragraphs, code, mermaid source) is in the served HTML — no JS dependency for crawlers.
- **Biggest problem: ~226 broken internal links.** Relative markdown links (`./x`, `../x`) are emitted verbatim, but exported pages live one directory deeper (`/dir/page/`), so every relative link resolves one level too deep → 404.
- **29 auto-index directory pages contain a complete nested HTML document** (`<article>` holds a second `<!DOCTYPE html><html><head><title>…`) — invalid HTML, ~2× weight, stray second `<title>`.
- Code blocks are duplicated in the DOM: highlighted `<pre><code>` + a `display:none` raw copy. Mermaid is **not** duplicated — only the source text is exposed (good).
- 49 pages use the generic fallback description "Vuong's documentations"; several pages got degenerate descriptions like `"Làm gì:"` (7 chars) from bold-label lines.
- 89,854 internal links lack the trailing slash that canonicals/sitemap use → every click pays a 301 hop.
- `lang="en"` while the content is Vietnamese — configuration mismatch in the docs repo (`site.language: "en"` should be `"vi"`).
- Firebase Hosting is configured correctly and causes no SEO problems.
- Indexing status **cannot** be proven from the site/build alone — requires Search Console.

## How SEO is implemented in mdsvr

- `src/seo/metadata.ts` — `resolveSeoData()`: single resolver for title (`frontmatter.seoTitle` → display title → `seo.titleTemplate`/`"<title> | <site title>"` default), description (`frontmatter.description` → `extractFirstParagraph(content)` → `site.description`), image (`frontmatter.image` → generated OG image in static export → `seo.defaultImage`), canonical via `buildPageUrl` (requires `site.baseUrl`), `article`/`website` type, breadcrumbs, `noIndex` from frontmatter.
- `src/seo/url.ts` — `normalizeUrlPath` (trailing-slash canonical form, index/readme collapse, percent-encoding), `buildPageUrl`, `buildSiteUrl`, `toAbsoluteAssetUrl`.
- `src/template/seo.ts` — `buildSeoTags()`: emits `<title>`, description, robots noindex, canonical, full OG + Twitter sets, `article:*` times, `rel="sitemap"`, RSS link. All absolute.
- `src/seo/jsonld.ts` — `buildJsonLd()`: `WebSite` (homepage), `Article` (documents), `BreadcrumbList` (nested routes); emits only real fields; `</` escaping.
- `src/seo/extract.ts` — `extractFirstParagraph`/`extractFirstHeading` for auto metadata from markdown.
- `src/generators/sitemap.ts` — export-path sitemap built from the actual exported page list (`generateSitemapFromPages`), deduped, sorted, noindex-excluded; scan-based variant for serve mode.
- `src/generators/robots.ts` — custom `robots.txt` in docs root wins; else `User-agent: *\nAllow: /\nSitemap: <siteUrl>sitemap.xml`.
- `src/generators/static-export.ts` — clean-URL export (`dir/page/index.html`), auto-index pages for dirs without README/index, OG image generation (`src/og/`), `search-index.json`, sitemap, robots, optional RSS.
- `src/link-transform.ts` — `convertMarkdownLinks` strips `.md`/`.mdx` extensions (but does NOT rebase relative paths — see Problem 1).

## Critical Problems

### P1 — Broken internal links from un-rebased relative markdown links (HIGH)

- **Problem:** Exported pages live at `/dir/page/` (trailing-slash clean URL = one extra directory level vs. the source file). `convertMarkdownLinks` only strips `.md`/`.mdx` and never rebases `./` or `../` against the source file's directory — every relative link resolves one level too deep in the browser.
- **Evidence:**
  - Source `agent-miniapp-marketplace/01-thiet-ke-he-thong/03-kien-truc-tong-the.md` contains `[bài 04](./04-local-broadcaster)` → served HTML keeps `href="./04-local-broadcaster"` → browser resolves `/agent-miniapp-marketplace/01-thiet-ke-he-thong/03-kien-truc-tong-the/04-local-broadcaster` → **404** (curl-verified). Intended `/agent-miniapp-marketplace/01-thiet-ke-he-thong/04-local-broadcaster/` returns 200.
  - Same for `../02-hoc-concept/…` links: `href="../02-hoc-concept/01-hoc-claude-code-hooks"` resolves to `/01-thiet-ke-he-thong/02-hoc-concept/…` → 404, while `/agent-miniapp-marketplace/02-hoc-concept/01-hoc-claude-code-hooks/` exists.
  - **216 unique dead targets / 226 dead link instances** across 15 sections (agent-miniapp-marketplace 40, projects 22, systems-algorithms 22, testing 21, DSA 19, rag 18, react-optimization 15, rust-cho-nodejs-dev 12, database 11, agile-methodology 10, redis 6, CICD 6, docker-course 5, gcp 4, aws 3, project-manager 2). ~29% of all unique internal link targets are dead.
- **Impact:** Crawl waste, lost internal PageRank, poor quality signals, broken UX.
- **Root cause:** `src/link-transform.ts` only rewrites the extension; nothing resolves `href` relative to the source file location before emitting the clean-URL page.

### P2 — Auto-index pages embed a complete nested HTML document (HIGH, 29 pages)

- **Problem:** `renderDirectory()` (`src/directory.ts:51`) returns a full standalone document (`<!DOCTYPE html><html><head><title><style><body>`). `renderDirectoryPage()` (`src/render-page.ts:153`) passes it as `body` into `renderPage()` → final file = outer template wrapping an entire second document inside `<article class="markdown-body">`.
- **Evidence:** Exactly the 29 auto-index pages (`/gcp/`, `/k8s/`, `/database/`, `/system-design/`, `/agent-miniapp-marketplace/01-thiet-ke-he-thong/`, …) contain 2 `<!DOCTYPE>`, 2 `<title>` (inner: `Index of /gcp/` — no site suffix), duplicated theme script + styles. Inner doc has no canonical/OG/JSON-LD of its own; outer page has no `<h1>` at all.
- **Impact:** Invalid HTML, ~2× page weight, stray `<title>`, unpredictable DOM for crawlers; thin pages with ugly `Index of /path/` titles (up to 129 chars) and generic description — yet they're in the sitemap.
- **Recommended fix:** `renderDirectory` should return only the listing fragment (`<h1>` + table/list). Give auto-index pages humanized titles or `noindex`.

### P3 — Weak/duplicated meta descriptions on ~15% of pages (MEDIUM)

- **Problem:**
  - 49 pages share `"Vuong's documentations"`: 29 auto-index pages + 20 content pages whose extraction failed (pages starting with tables/headings/lists, e.g. `/redis/cheatsheet/`, `/k8s/Commands/*`, `/CICD/cheatsheet/`).
  - Degenerate extractions: `"Làm gì:"` ×5 (terraform labs), `"Functional:"` ×2 — `extractFirstParagraph` accepts a bold-label line like `**Làm gì:**` as a paragraph, then stops at the following list → 7–11 char descriptions.
  - Markdown remnants in 6 descriptions, e.g. `/gcp/faq/` desc contains `[Region]-[Ký tự chữ cái]`, `_[Stories đang làm…]_`.
- **Impact:** Bad SERP snippets, low CTR, duplicate-description flags.
- **Recommended fix:** In `src/seo/extract.ts`: skip short label-like lines ending in `:`; if first "paragraph" is < ~40 chars continue to the next instead of stopping; extend `cleanInline` to strip `_…_` italics and `[bracket]` shorthand.

### P4 — Internal links use non-canonical (no-trailing-slash) form (LOW–MEDIUM)

- **Problem:** Sidebar/breadcrumb/prev-next links emit `href="/testing/06-evaluation/01-criteria"` while canonicals + sitemap use `/…/01-criteria/`. Counted **89,854** root-relative links without slash vs 17,984 with.
- **Evidence:** `curl /gcp` → `301 → /gcp/` — works but every crawl/click costs a redirect.
- **Fix:** Emit trailing-slash hrefs in `src/template/sidebar.ts`, breadcrumb rendering, prev/next.

### P5 — `lang="en"` on Vietnamese content (LOW)

- `_mdsvr/settings.json` in the docs repo sets `site.language: "en"` while all content is Vietnamese. Set `"vi"`. Docs-repo config fix, not a generator bug.

## Metadata Audit

| Check       | Result                                                                                                                                                                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title       | PASS w/ notes — 0 missing, 0 duplicates, consistent `\| Vuong's Docs` suffix, dedupe works on homepage. 34 titles >70 chars (auto-index `Index of /long/path/` up to 129 chars; some long content titles). `seoTitle` override supported but unused in this docs set. |
| Description | PASS w/ notes — 0 missing; issues per P3. Frontmatter `description:` override verified working (`05-desktop-shell-electron`).                                                                                                                                         |
| Canonical   | PASS — 328/328 absolute `https://vuong-docs.web.app/path/`, unique, exact sitemap match, no localhost/filesystem/query leakage.                                                                                                                                       |
| Open Graph  | PASS — all pages have title/desc/type/url/site_name/image; `article`×298 / `website`×30; per-page generated OG images absolute + 200 (`/public/assets/og/…/index.jpg`). Missing `og:locale`, `og:image:width/height`.                                                 |
| Twitter     | PASS — `summary_large_image` + title/desc/image consistent on all pages. `twitter:site` unconfigured.                                                                                                                                                                 |
| robots meta | N/A on prod — no `noindex` pages exist in this docs set; code emits `noindex, nofollow` + sitemap exclusion (verified in source, untested on prod).                                                                                                                   |

## Sitemap

- Pages generated: **328** | URLs in sitemap: **328** | Missing: **0** | Extra: **0** | Duplicates: **0**
- Valid XML, correct `http://www.sitemaps.org/schemas/sitemap/0.9` namespace, absolute URLs, consistent trailing slash, deterministic sort, no assets (`search-index.json`, OG images correctly excluded), no localhost.
- All `lastmod` = deploy date (CI checkout mtimes) — harmless, low value.

## robots.txt

```
User-agent: *
Allow: /
Sitemap: https://vuong-docs.web.app/sitemap.xml
```

200 `text/plain`. Correct; sitemap URL matches reality.

## Structured Data

| Type           | Result                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| Article        | PASS — 298 pages; `headline`/`description`/`url`/`image` present, `url` == canonical, no invented author/dates |
| BreadcrumbList | PASS — 327 pages; correct positions, real nav titles, item URLs match canonicals                               |
| WebSite        | PASS — homepage only; could add `potentialAction` SearchAction                                                 |

0 parse errors across 328 pages; JSON-LD is server-rendered (not JS-injected) so curl-verified.

## Crawlability

PASS — document content fully server-rendered (h1/h2/p/links/code verified in raw curl output). JS only needed for Mermaid SVG and search. Proper 404s; `http`→`https` 301; `/foo`→`/foo/` 301; `/foo/index.html`→`/foo/` 301; `/index.html`→`/` 301.

## Internal Links

- Unique internal targets: **754** | Broken targets: **216** (226 instances, all curl-verified 404) | Orphans: **0** | Suspicious (localhost/filesystem/`index.html`/`.md` hrefs): **0**
- Slash inconsistency: 89,854 links without trailing slash vs canonical slash form.

## Duplicate Content

- **Mermaid:** NOT duplicated — single `<div class="mermaid">source</div>` in raw HTML; SVG is client-rendered. Source text indexable once.
- **Code blocks:** DUPLICATED — every block ships highlighted `<pre><code class="hljs">` + `<pre class="code-block-raw" style="display:none;">` (raw copy for the copy feature). Crawlers see both.
- **Auto-index pages:** entire second document nested → duplicated `<title>`, styles, theme script, head markup.
- **Navigation:** identical sidebar on every page (normal for docs, but dominates the ~176 KB median page weight).
- **URL-level duplication:** none — `/foo`, `/foo/`, `/foo/index.html` all collapse to `/foo/` via 301.

## HTML Quality

- `<html lang>` present on all pages but `en` ≠ actual Vietnamese content.
- `charset`/`viewport` present on all pages. 0 duplicate IDs.
- Invalid nesting: `<pre class="mermaid-wrapper"><div class="mermaid-container">` and `<pre class="code-block-wrapper"><div class="code-block-container">` (browsers auto-close `pre`, works but malformed).
- Headings: 279 pages exactly 1 h1; 30 pages 0 h1 (auto-index); 17 pages multiple h1s (source docs use `#` repeatedly — authoring issue).
- Images: 52 content images, 7 missing `alt`, ~all missing `width`/`height`. No favicon (`/favicon.ico` 404, no `<link rel="icon">`).

## Performance-related statics

- HTML size: min ~140 KB, median ~176 KB, max ~329 KB (full CSS + sidebar inlined per page; auto-index pages ~2×).
- 5–6 `<script>` per page (all inline), 1 `<style>` (2 on nested-doc pages), images mostly OG-generated.
- Lighthouse: **not available** in this environment (`npx lighthouse` not installed) — static analysis only.

## Production Verification

| URL                                                                                | Status | Content-Type                | Redirect                  |
| ---------------------------------------------------------------------------------- | ------ | --------------------------- | ------------------------- |
| `/`                                                                                | 200    | `text/html; charset=utf-8`  | —                         |
| `/robots.txt`                                                                      | 200    | `text/plain; charset=utf-8` | —                         |
| `/sitemap.xml`                                                                     | 200    | `application/xml`           | —                         |
| `/k8s/`                                                                            | 200    | `text/html`                 | —                         |
| `/k8s/LFS158-docs/13/`                                                             | 200    | `text/html`                 | —                         |
| `/terraform/05-lab-remote-state-workspace/`                                        | 200    | `text/html`                 | —                         |
| `/agent-miniapp-marketplace/02-hoc-concept/03-hoc-extensibility-rules-skills-mcp/` | 200    | `text/html`                 | —                         |
| `/system-design/use-cases/0-1-easy/`                                               | 200    | `text/html`                 | —                         |
| `/index.html`                                                                      | 301    | —                           | → `/`                     |
| `/gcp`                                                                             | 301    | —                           | → `/gcp/`                 |
| `http://…/gcp/`                                                                    | 301    | —                           | → `https://`              |
| `/nonexistent-page-xyz/`                                                           | 404    | `text/html`                 | —                         |
| `/feed.xml`                                                                        | 404    | —                           | RSS disabled — consistent |
| `/favicon.ico`                                                                     | 404    | —                           | no favicon configured     |
| `/public/assets/og/gcp/index.jpg`                                                  | 200    | `image/jpeg`                | works                     |

HSTS present. Firebase serves the export faithfully — production == generator output.

## Improvement Proposals for mdsvr (ranked by impact)

1. **Rebase relative links during render/export** — in `renderPageService`/`convertMarkdownLinks`, resolve every relative `href`/`src` (including extensionless links that resolve to a `.md`/`.mdx` file) against the source file's directory and emit the canonical absolute route (`/dir2/x/`). Add a validator warning for links that resolve outside the docs root. _(fixes ~226 dead links)_
2. **Fix `renderDirectory()`** to return a body fragment only (`<h1>` + listing), not a full document — removes the nested-document bug on all auto-index pages.
3. **Emit trailing-slash hrefs** in sidebar, breadcrumbs, prev/next, and directory listings to match the canonical convention and eliminate 301 hops.
4. **Improve `extractFirstParagraph`** — skip label-like lines (`**Label:**` before a list), don't stop at a <40-char "paragraph", strip `_…_` and bracket shorthand; reduces duplicate/fallback and degenerate descriptions.
5. **Improve auto-index page quality** — humanized titles (`<Dir name>` not `Index of /path/`), a real `<h1>`, per-dir description, or `noindex` option for auto-generated listings.
6. **Add `site.favicon` support** (verify whether settings schema already supports it; document it) — currently no icon emitted.
7. **Remove `display:none` code duplication** — keep raw code in a `data-*` attribute or JS map instead of a second `<pre>`; also fixes page weight.
8. **Fix `<pre><div>` invalid nesting** in mermaid and code-block wrappers (use `<div>` wrappers or proper pre semantics).
9. **Enrich OG/Twitter:** `og:locale` (from `site.language`), `og:image:width/height` (1200×630), optional `twitter:site`, `article:published_time` when frontmatter dates exist (already implemented — docs should just use `date:`/`dateModified:` frontmatter).
10. **Add `potentialAction` SearchAction to WebSite JSON-LD** when search is enabled.

### Docs-repo (`vuong-docs`) fixes — not generator changes

- Set `site.language: "vi"` in `_mdsvr/settings.json`.
- Add `description:` frontmatter to the ~20 content pages falling back to the site description (cheatsheets, `/k8s/Commands/*`, etc.).
- Fix the ~216 relative links once the generator rebases (or authors switch to root-relative links now).
- Add a favicon file + `site.favicon` config.
- Merge/split multi-H1 source docs (17 pages) — content authoring issue.

## Final Verdict

1. **Technically SEO-ready?** Mostly — metadata/canonical/sitemap/robots/JSON-LD layer is solid, but fix P1 (broken relative links) and P2 (nested auto-index docs) before calling it production-grade.
2. **Crawlable without JS?** Yes — content fully static; only Mermaid SVG and search need JS.
3. **sitemap.xml correct?** Yes.
4. **robots.txt correct?** Yes.
5. **Canonicals correct?** Yes — 328/328 verified.
6. **Metadata unique?** Titles yes; descriptions mostly (49 fallback duplicates, a few pairs).
7. **JSON-LD valid?** Yes — all pages, correct types, URLs match canonicals.
8. **Duplicate content problems?** Moderate — hidden raw code duplicate + nested auto-index documents; mermaid fine.
9. **Firebase causing problems?** No — hosting is correctly configured.
10. **Highest-priority improvement:** Relative-link rebasing (P1).

_Indexing status cannot be proven from the repository/build alone — verify in Google Search Console._

---

## Update 2026-10-04 — Fixes implemented (plan `19.seo-improvements.md`)

All proposals above have been implemented in the mdsvr source and verified by
unit tests (146 pass) and a fresh `gh-pages/docs` export. **The audited
production site has not been redeployed yet**, so the findings above still
describe https://vuong-docs.web.app until a new export is deployed.

| Audit finding                              | Fix                                                                                                                                                       | Verified                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| P1 — 216 broken link targets (29%)         | Context-aware `transformLinks` rebases relative `href`/`src` against the source file's dir → canonical routes; missing/outside-root links warn            | Unit tests + export shows only 1 pre-existing missing-asset warning; **full re-crawl pending** |
| P2 — 29 nested-document auto-index pages   | `renderDirectory` returns a fragment (`<h1>` + `.dir-listing`); pages get humanized titles + descriptions; optional `seo.noIndexDirectoryPages`           | `gh-pages/docs`: 1 doctype/title per page                                                      |
| P3 — 49 fallback + degenerate descriptions | `extractFirstParagraph` skips label-lines/`_…_`/bracket shorthand, continues past <40-char paragraphs; 34 vuong-docs files got `description:` frontmatter | Extractor tests + vuong-docs validation clean                                                  |
| P4 — 89,854 non-canonical hrefs            | Sidebar/breadcrumb/prev-next/listing/search/feed all emit trailing-slash canonical                                                                        | `gh-pages/docs` export verified                                                                |
| P5 — `lang="en"` on Vietnamese             | `site.language: "vi"` in vuong-docs settings                                                                                                              | Settings updated                                                                               |
| Hidden `code-block-raw` duplication        | Raw code moved to `data-code` attribute; hidden `<pre>` removed                                                                                           | Tests + export                                                                                 |
| `<pre><div>` invalid nesting               | Wrappers changed to `<div>` (`code-block-wrapper`, `mermaid-wrapper`)                                                                                     | Tests + export                                                                                 |
| Missing `og:locale`, `og:image` dims       | `og:locale` from `site.language`; `og:image:width/height` = 1200×630 for generated OG                                                                     | Verified in exported HTML                                                                      |
| Missing `SearchAction`                     | `potentialAction` on WebSite JSON-LD when search enabled; search UI reads `?q=`                                                                           | Tests                                                                                          |
| Missing favicon                            | `site.favicon` documented; `favicon.svg` added to vuong-docs                                                                                              | Config in place                                                                                |
| 17 multi-H1 pages (authoring)              | Subsequent `#` demoted to `##` in vuong-docs; validator confirms no hierarchy regressions                                                                 | `--validate-md` clean                                                                          |
| Docs-repo links                            | 57 warnings in `docs/` autofixed/hand-fixed; `--validate-md` clean                                                                                        | Clean                                                                                          |

**New capabilities added beyond the audit:** `analytics.*` settings
(GA4/GTM/Clarity/Plausible/Umami/`customHead`) and `seo.verification.*` meta
tags (Google/Bing/Yandex/Pinterest/Naver) — emit identically in serve and
export. vuong-docs configured with `analytics.googleAnalytics`.

**Expected score impact:** P1+P2 fixed → Internal linking ~4→9, HTML quality
~2→4, metadata ~11→13, canonicalization ~9→10. Estimated re-audit score:
**~92–95/100** (pending production verification after redeploy).

**Still open:** full link re-crawl on a vuong-docs export; production re-audit
after Firebase redeploy; Search Console indexing check; optional sitemap
`lastmod` from git history (deferred).
