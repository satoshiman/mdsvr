---
name: mdsvr-to-epub
description: Convert an mdsvr documentation folder (a doc site served or exported by mdsvr) into a single valid EPUB 3 ebook. Understands mdsvr conventions — README.md directory indexes, numeric-prefix ordering, _mdsvr/settings.json metadata, mdsvr-style internal links (./page, ./dir/, no extension), .mdx files and components (Callout, Mermaid, Steps, Tabs, Card, Badge). Renders ```mermaid blocks to PNG via mermaid.ink and draws wide tables to PNG with Pillow.
argument-hint: "[--input <docs_dir|file> ...] [--output <path>] [--title <t>] [--author <a>] [--language <code>]"
allowed-tools:
  - read
  - write
  - edit
  - exec
  - grep
  - glob
  - ask_user_question
license: MIT
---

# mdsvr to EPUB

Convert an mdsvr docs folder (e.g. `docs/`, `default-docs/`, or any doc set
served by `mdsvr`/`npx mdsvr`) into one EPUB 3 ebook with cover, table of
contents, and embedded images. Pure Python (stdlib + `markdown` + `Pillow`)
— no pandoc / calibre / Node required.

## When to use

- "convert the docs to epub", "đóng gói tài liệu mdsvr thành ebook",
  "export this doc site as an ebook"
- The input is an **mdsvr doc set** — a directory of `.md`/`.mdx` files
  using `README.md` as directory indexes and `_mdsvr/` for settings.
- For generic (non-mdsvr) markdown folders or fetched X posts, use the
  `docs-to-epub` / `x-post-to-epub` skills in the vuong-knowledge repo
  instead.

## Usage

```bash
python3 <skill_dir>/mdsvr_to_epub.py \
  --input docs \
  --output epub/mdsvr-docs.epub \
  --title "mdsvr Documentation" \
  --author "Vuong" --language en
```

Where `<skill_dir>` is the directory containing this SKILL.md
(`skills/mdsvr-to-epub/`).

Dependencies: `pip install markdown pillow` if the active `python3` lacks
them (or reuse the vuong-knowledge venv at
`/Users/apple/vuong-knowledge/.venv/bin/python`, which already has both).

Options:

| Argument | Description | Default |
|----------|-------------|---------|
| `--input`, `-i` | Docs directory and/or `.md`/`.mdx` files (required, repeatable). Directories are walked recursively in mdsvr sidebar order. | — |
| `--output`, `-o` | Output `.epub` path (required). | — |
| `--title` | Book title. | `site.title` from `_mdsvr/settings.json`, else input dir name |
| `--author` | Book author. | `Unknown` |
| `--language` | ISO language code (`en`, `vi`, ...). | `site.language` from settings.json, else `en` |
| `--description` | Book description. | `site.description` from settings.json |
| `--cover` | Cover image path. | first embedded image |
| `--mermaid-aspect` | Canvas aspect `w:h` for rendered mermaid PNGs and table images (e.g. `3:4`, `16:9`); `none` keeps natural size. | `3:4` |
| `--table-image-cols` | Markdown tables with more than N columns are drawn to PNG with Pillow (wide tables get clipped on e-readers); `none` disables. | `4` |

## What it does

1. **Doc discovery (mdsvr sidebar order).** Walks the input directory like
   the auto-generated sidebar: names starting with `_` or `.` are hidden
   (so `_mdsvr/` is excluded), each directory's `README.md`/`index.*` is
   emitted first as the section intro, then files and subdirectories
   interleave alphabetically — `01-`, `02-` prefixes order the parts.
2. **Metadata.** Reads `<input>/_mdsvr/settings.json` for `site.title`,
   `site.description`, `site.language` as defaults for the EPUB metadata.
   Per-page YAML frontmatter `title:` (else the first `# ` heading) becomes
   the part label in the TOC.
3. **MDX downgrade.** `.mdx` files (and `.md` files containing components)
   are preprocessed: `import`/`export` lines removed, `<Callout type="…">`
   becomes a styled GitHub alert, `<Mermaid>` becomes a ` ```mermaid `
   block, `<Steps>`, `<Tabs>`/`<Tab label>` , `<Card>`, `<CardGroup>`,
   `<Accordion>`, `<CodeGroup>` are unwrapped, `<Badge>x</Badge>` becomes
   inline code. Interactive behavior is lost — content is preserved.
4. **Mermaid → PNG.** Every ` ```mermaid ` block renders via the
   mermaid.ink API (e-reader safe — no SVG/JS), landscape diagrams rotate
   90°, and results pad onto the `--mermaid-aspect` canvas. Renders cache
   under `<doc-dir>/images/mermaid/` (raw renders in `raw/`) next to the
   source file so re-runs are fast — note this writes cache files inside
   the docs tree; delete the processed PNGs to re-apply rotation/padding.
5. **Wide tables → PNG.** Tables wider than `--table-image-cols` columns
   are drawn locally with Pillow into `<doc-dir>/images/tables/`.
6. **Internal links.** mdsvr-style links are resolved to EPUB chapter
   links: `./page`, `./page.md`, `./dir/` (→ dir README), `../page`,
   `/absolute/path`, and `#anchor` fragments — including cross-chapter
   anchors (each `##`-split chapter keeps its heading `id`s). Links that
   don't resolve to a doc in the set are left as-is.
7. **Alerts.** GitHub `> [!NOTE|TIP|WARNING|CAUTION|IMPORTANT]` alerts
   become styled blockquotes (colored border + background).
8. **Chapters & TOC.** Each doc file splits into chapters at `## `
   headings; the file becomes a part in the nested `nav.xhtml` TOC, in
   sidebar order.
9. **Images & cover.** All referenced local images are embedded
   (`/assets/…` resolves against the docs root); the first image becomes
   the cover unless `--cover` is given.

## Workflow

Confirm the build plan with the user before running (same convention as
`x-post-to-epub`):

1. Point `--input` at the docs folder (e.g. `./docs`).
2. Confirm title / author / language / output path — suggest defaults from
   `_mdsvr/settings.json` and `epub/<dir-name>.epub`.
3. Run the script, then report: output path, doc page count, chapter
   count, image count, cover status. Suggest opening in Apple Books /
   Calibre to verify.

## Notes / limitations

- Mermaid rendering needs network access to mermaid.ink; on failure the
  block degrades to a plain code block with a warning.
- Only locally-referenced images are embedded; remote `https://` images
  stay as-is (visible only on networked readers).
- MDX interactive components render as static content.
- Cache PNGs are written under `<doc-dir>/images/{mermaid,tables}/`; these
  directories contain no `.md` files so mdsvr ignores them, but they show
  up in `git status` if the docs tree is a repo.

## Files

- `mdsvr_to_epub.py` — main Python script (stdlib + `markdown` + `Pillow`).
