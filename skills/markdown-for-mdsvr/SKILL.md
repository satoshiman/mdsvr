---
name: markdown-for-mdsvr
description: >
  Generate complete, multi-file Markdown documentation sets (doc sites) that are
  fully compatible with mdsvr (Markdown Server). Use this skill whenever the user
  wants to create documentation, write a doc site, build technical docs, generate
  a knowledge base, or produce any set of .md files that will be served or exported
  by mdsvr. Always trigger for: "generate documentation", "create doc site", "write guides", "create wiki", or any request involving multiple
  markdown files intended for a documentation server or static export.
---

# Markdown for mdsvr Skill

Generate a complete, valid, multi-file Markdown documentation set for use with
[mdsvr](https://github.com/satoshiman/mdsvr) — supports both server mode and
static export.

When this skill is triggered, produce **multiple `.md` files** that form a cohesive
documentation site, following all mdsvr conventions strictly.

---

## Step 1 — Understand the Request

Before generating files, extract from the user's request:

1. **Topic / product name** — what is being documented?
2. **Target audience** — developers, end-users, ops teams, etc.
3. **Scope** — how many pages / sections are needed?
4. **Language** — Vietnamese, English, or bilingual?
5. **Diagrams needed?** — if yes, read `references/rules/mermaid.md` for syntax rules.

If any of these are unclear, ask ONE focused question before proceeding.

---

## Step 2 — Plan the File Structure

Design a logical hierarchy **before** writing content. A typical mdsvr doc site:

```
docs/
├── README.md                    ← Homepage (required)
├── 01-getting-started/
│   ├── README.md                ← Section index
│   ├── 01-installation.md
│   ├── 02-quickstart.md
│   └── 03-configuration.md
├── 02-guides/
│   ├── README.md
│   ├── 01-basic-usage.md
│   └── 02-advanced.md
├── 03-api-reference/
│   ├── README.md
│   └── 01-endpoints.md
└── 04-troubleshooting.md
```

Adapt structure to user's topic. Scale up or down as needed.

---

## Step 3 — Apply mdsvr File & Link Rules (MANDATORY)

### 3.1 File Naming Rules

| Rule                         | ❌ Wrong                | ✅ Correct           |
| ---------------------------- | ----------------------- | -------------------- |
| No dots in middle of name    | `0.1.quickstart.md`     | `01-quickstart.md`   |
| No dots in middle of name    | `config.v2.md`          | `config-v2.md`       |
| Use kebab-case               | `GettingStarted.md`     | `getting-started.md` |
| Use numeric prefix for order | `guide.md` (in sidebar) | `01-guide.md`        |
| Descriptive names            | `page1.md`              | `installation.md`    |
| Directory index must be      | `index.md`              | `README.md`          |

### 3.2 Link Structure Rules

| Rule                             | ❌ Wrong                                           | ✅ Correct                      |
| -------------------------------- | -------------------------------------------------- | ------------------------------- |
| Use relative paths only          | `[Guide](/docs/guide)`                             | `[Guide](./guide)`              |
| No `.md` extension in links      | `[Setup](./setup.md)`                              | `[Setup](./setup)`              |
| Link to directory, not README    | `[Start](./01-getting-started/README)`             | `[Start](./01-getting-started)` |
| Anchor links must match headings | `[See](#install-steps)` (if heading doesn't exist) | Match exactly                   |

### 3.3 Heading Structure Rules

| Rule                         | ❌ Wrong                | ✅ Correct                      |
| ---------------------------- | ----------------------- | ------------------------------- |
| Every page needs H1          | _(page starts with H2)_ | `# Page Title` as first heading |
| Don't skip heading levels    | H1 → H3                 | H1 → H2 → H3                    |
| Headings must be descriptive | `## Section 1`          | `## Installation Requirements`  |

---

## Step 4 — Apply Frontmatter to Every File

Each `.md` file must include YAML frontmatter for SEO and mdsvr metadata:

```yaml
---
title: "Page Title"
description: "One-sentence description of this page's content."
---
```

---

## Step 5 — Content Guidelines

### README.md (Homepage) — Required

- Must exist at the root of the docs folder.
- Include: project overview, quick navigation links to all sections.
- Use a welcome callout if appropriate.

### Section README.md (Directory Index)

- Summarize what the section covers.
- List all pages in the section with relative links.

### Content Pages

- One focused topic per page.
- Start with a brief intro paragraph.
- Use MDX components where appropriate:
  - `:::note`, `:::warning`, `:::tip`, `:::danger` for callouts.
  - Numbered lists for step-by-step procedures.
- Link liberally to related pages using relative paths.
- End with a "Next Steps" or "Related" section when useful.

---

## Step 6 — Mermaid Diagrams (When Needed)

If the documentation benefits from diagrams (architecture, flows, sequences, ERDs,
state machines, etc.), embed Mermaid diagrams inline in the relevant `.md` files.

> **Before generating any diagram**, read `references/rules/mermaid.md` for the full
> syntax reference and generation rules. All rules in that file are mandatory.

**Quick checklist (from mermaid.md):**

- Choose the most appropriate diagram type — do NOT default to `flowchart`.
- Always declare direction in flowcharts: `flowchart TD` or `flowchart LR`.
- Node IDs: only letters, numbers, underscores. No `-`, `.`, `(`, `)`.
- Node labels with spaces must use double quotes: `A["My Label"]`.
- Subgraphs must have explicit IDs: `subgraph myid["Label"]`.
- Sequence diagrams: declare all `participant` lines before messages.
- No hardcoded colors or styles unless user explicitly requests.
- Use emoji instead of colors to convey semantic meaning.
- One diagram per code block; validate syntax before outputting.

---

## Step 7 — Create Files and Deliver

Use `create_file` to write each `.md` file to the filesystem. Then zip everything
and call `present_files` so the user can download the result.

### 7.1 Write each file

For every file in the planned structure, call `create_file` with the full path
under `/mnt/user-data/outputs/<project-name>/`:

```
/mnt/user-data/outputs/my-project/README.md
/mnt/user-data/outputs/my-project/01-getting-started/README.md
/mnt/user-data/outputs/my-project/01-getting-started/01-installation.md
...
```

Write the complete, final content in each call — do not write placeholders.

### 7.2 Zip and present

After all files are written, zip the output folder and call `present_files`:

```bash
cd /mnt/user-data/outputs
zip -r my-project-docs.zip my-project/
```

Then call `present_files` with the path to the `.zip` file.

### 7.3 Summary in chat

After `present_files`, write a short message in chat containing:

1. **File tree** — show the complete directory structure that was generated.
2. **How to serve** — one-liner: `npx mdsvr ./my-project` or `mdsvr ./my-project`.
3. **Page count** — e.g. "Generated 8 pages across 3 sections."

---

## Quick Reference — Common Mistakes to Avoid

```
❌ Absolute path in link:     [Page](/docs/page)
✅ Relative path:             [Page](./page)

❌ .md extension in link:     [Page](./page.md)
✅ No extension:              [Page](./page)

❌ Link to README file:       [Section](./01-section/README)
✅ Link to directory:         [Section](./01-section)

❌ Dot in filename:           01.quickstart.md
✅ Hyphen separator:          01-quickstart.md

❌ Missing H1:                ## Introduction  (first heading is H2)
✅ Start with H1:             # Introduction

❌ Skipped heading level:     # Title → ### Sub (skips H2)
✅ Proper hierarchy:          # Title → ## Section → ### Subsection

❌ No frontmatter:            (file starts directly with #)
✅ Frontmatter present:       --- title: "..." description: "..." ---
```

---

## Reference Files

- `references/rules/mermaid.md` — Full Mermaid v11 syntax reference for all 19 diagram
  types. Read this whenever any diagram is needed in the documentation.
