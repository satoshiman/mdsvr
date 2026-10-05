# mdsvr Rules (self-contained)

Condensed rules so this skill works even when the `markdown-for-mdsvr` skill is not
installed. If `markdown-for-mdsvr` is available, read it as well and prefer it where it
is more detailed (especially `rules/mermaid.md` for the full Mermaid reference).

## Contents

1. File naming
2. Links
3. Headings
4. Frontmatter
5. Callouts
6. Mermaid
7. Quiz blocks
8. Course folder layout
9. Final checklist

## 1. File naming

| Rule                            | Wrong                          | Correct                       |
| ------------------------------- | ------------------------------ | ----------------------------- |
| No dots in the middle of a name | `0.1.intro.md`, `config.v2.md` | `01-intro.md`, `config-v2.md` |
| kebab-case                      | `GettingStarted.md`            | `getting-started.md`          |
| Numeric prefix for ordering     | `basics.md`                    | `01-basics.md`                |
| Descriptive names               | `page1.md`                     | `installation.md`             |
| Directory index is README       | `index.md`                     | `README.md`                   |

## 2. Links

| Rule                                  | Wrong                      | Correct             |
| ------------------------------------- | -------------------------- | ------------------- |
| Relative paths only                   | `[Guide](/docs/guide)`     | `[Guide](./guide)`  |
| No `.md` extension                    | `[Setup](./setup.md)`      | `[Setup](./setup)`  |
| Link to the directory, not its README | `[Ch1](./01-intro/README)` | `[Ch1](./01-intro)` |
| Anchors must match a real heading     | `[See](#nope)`             | match exactly       |

From a lesson to a sibling lesson: `./02-next-lesson`.
From a lesson to another chapter: `../02-chapter-name/01-lesson`.

## 3. Headings

- Every page starts with exactly one H1 (after frontmatter).
- Never skip levels (H1 then H2 then H3).
- Headings are descriptive, not "Section 1".

## 4. Frontmatter (every file)

```yaml
---
title: "Page Title"
description: "One sentence describing this page."
---
```

## 5. Callouts

GitHub-style alert blockquotes. Every line of the callout starts with `>`.

| Type             | Use for in a course                                              |
| ---------------- | ---------------------------------------------------------------- |
| `> [!NOTE]`      | Side information, Quick Review blocks, course meta (time, level) |
| `> [!TIP]`       | Tips, tricks, expert shortcuts                                   |
| `> [!IMPORTANT]` | Background, clarifications                                       |
| `> [!WARNING]`   | Common mistakes, pitfalls                                        |
| `> [!CAUTION]`   | Destructive commands, security risks                             |
| `> [!SUCCESS]`   | Expected lab output                                              |

```markdown
> [!TIP]
> Multi-line content is fine. Every line needs the `>` prefix.
```

`NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION` also render natively on GitHub.
`SUCCESS` (and `INFO`, `DANGER`) are mdsvr extensions: they render as styled callouts
in mdsvr but degrade to plain blockquotes on GitHub — still fine for course content.

mdsvr also understands inline `:::type content :::` one-liners, but do NOT use them in
generated courses — GitHub alert syntax is more portable and supports multi-paragraph
content.

## 6. Mermaid rules

Use diagrams only when they teach something better than text.

1. **Pick the best diagram type**, not always flowchart. Options: flowchart, sequenceDiagram,
   classDiagram, stateDiagram-v2, erDiagram, journey, gantt, pie, gitGraph, mindmap,
   timeline, quadrantChart, requirementDiagram, sankey-beta, xychart-beta, block-beta,
   packet-beta, architecture-beta, kanban. If several fit, briefly say why one was chosen.
2. Use the latest syntax: `flowchart` (not `graph`), `stateDiagram-v2`, `->>` / `-->>`
   in sequence diagrams.
3. Node IDs: letters, numbers, underscores only (`user_service`). Never `-` or `.`.
   Never reserved words: end, class, click, style, graph, subgraph.
4. Labels: always quoted: `A["Order Service"]`. Keep short. No Markdown, no HTML tags,
   no `( ) [ ] { } < > | " '` inside labels.
5. Line break inside a label: use the HTML break tag `<br />`, never `\n`.
6. Flowcharts: always declare direction (`flowchart TD` or `flowchart LR`).
7. Subgraphs: always with ID and quoted label: `subgraph backend["Backend"]`.
8. Sequence diagrams: declare all `participant` lines before any message.
9. ER diagrams: valid relations only, e.g. `USER ||--o{ ORDER : places`.
10. Class diagrams: use visibility and types, e.g. `+createUser()`, `-password`, `+id: string`.
11. `architecture-beta` and `block-beta`: official syntax only, do not mix flowchart syntax.
12. **No styling** (`style`, `classDef`, `class`, `linkStyle`, `themeVariables`, colors)
    unless the user explicitly asks. Diagrams must work in light and dark mode.
13. Convey meaning with emoji instead of color: ✅ ❌ ⚠️ 🔒 🔑 🚀 📦 🗄️ 🌐 👤 🤖 💾.
14. One diagram per code block, valid syntax, split only if the user asks.

## 7. Quiz blocks

Quizzes are ` ```quiz ` fenced blocks containing JSON — interactive and
client-graded, in `.md` and `.mdx` alike. Follow the template in
`lesson-templates.md` §6 exactly.

- `mode`: `"exam"` (one Check button) or `"practice"` (per-question check).
- Types: `single` (`answer: <0-based index>`), `multiple` (`answer: [i, j]`),
  `true-false` (`answer: true|false`), `self-check` (`answer: "<model answer>"`).
- `options` needs ≥ 2 entries; every `answer` index must be in range.
- `explanation` is optional but strongly recommended — it teaches.
- Strict JSON only: double quotes, no comments, no trailing commas.

## 8. Course folder layout

```
<course-slug>/
├── README.md                      Course homepage: goal, audience, time table, how to study
├── 00-prerequisites.md            Only if needed
├── 01-<chapter>/
│   ├── README.md                  Chapter overview, lesson list, time estimate
│   ├── 01-<lesson>.md
│   ├── 02-<lesson>.md
│   ├── 98-quiz.md                 If the learner wants chapter quizzes
│   └── 99-cheatsheet.md           Chapter cheatsheet
├── 02-<chapter>/ ...
├── 90-capstone.md                 Only if the learner wants a capstone project
└── 99-cheatsheet.md              Final course cheatsheet
```

Adapt freely. Rules from sections 1 to 5 always apply.

## 9. Final checklist

- [ ] Root `README.md` exists; every folder has a `README.md` listing its pages
- [ ] No dots in file names; kebab-case; numeric prefixes
- [ ] All links relative, no `.md`, directory links without `README`
- [ ] Every file has frontmatter and one H1; no skipped heading levels
- [ ] Callouts use `> [!TYPE]` with `>` on every line; only supported types
- [ ] Mermaid: IDs safe, labels quoted, directions declared, no styling
- [ ] Quizzes use ` ```quiz ` JSON blocks; answer indices in range, valid types
- [ ] Code blocks have a language tag; lab steps are numbered
