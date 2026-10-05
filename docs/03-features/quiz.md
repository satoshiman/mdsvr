# Interactive Quizzes

mdsvr renders ` ```quiz ` fenced blocks as interactive, self-grading quizzes. Questions, options, and answers are written as JSON; the reader sees a form, clicks **Check answers**, and gets instant feedback with a score. Results are stored per-user in `localStorage` — no backend required, works in static exports too.

## Live Demo

Everything below is a real, working quiz — select answers and grade them right here.

**Exam mode** — answer everything, then check it all at once. Covers all four question types:

````quiz
{
  "id": "mdsvr-quiz-demo-exam",
  "title": "mdsvr knowledge check",
  "mode": "exam",
  "questions": [
    {
      "type": "single",
      "question": "Which command serves a docs folder locally?",
      "options": ["`mdsvr build ./docs`", "`mdsvr ./docs`", "`mdsvr serve --docs`"],
      "answer": 1,
      "explanation": "Point `mdsvr` (or `npx mdsvr`) at the folder — serving is the default action."
    },
    {
      "type": "multiple",
      "question": "Which of these ship with mdsvr out of the box?",
      "options": [
        "Full-text search",
        "Mermaid diagrams",
        "A hosted comments service",
        "Dark mode"
      ],
      "answer": [0, 1, 3],
      "explanation": "Search, Mermaid, and theming are built-in. Comments would need a third-party embed."
    },
    {
      "type": "true-false",
      "question": "` ```quiz ` blocks only work in `.md` files, not `.mdx`.",
      "answer": false,
      "explanation": "The same fence works in both — in `.mdx` it compiles to the `<Quiz>` component."
    },
    {
      "type": "self-check",
      "question": "In your own words: why do quiz stats survive a page reload?",
      "answer": "Grading results are written to `localStorage` under `mdsvr-quiz:<id>` — per-browser, no server needed."
    }
  ]
}
````

**Practice mode** — each question has its own **Check** button and locks after grading:

```quiz
{
  "id": "mdsvr-quiz-demo-practice",
  "title": "Try it one question at a time",
  "mode": "practice",
  "questions": [
    {
      "type": "single",
      "question": "Where are per-user quiz stats stored?",
      "options": ["In a server database", "In `localStorage`", "In the page's URL"],
      "answer": 1,
      "explanation": "Stats live under `mdsvr-quiz:<id>` in the browser — works in static exports too."
    },
    {
      "type": "true-false",
      "question": "Changing a quiz's JSON resets its stored stats (when it has no explicit `id`).",
      "answer": true,
      "explanation": "Without an `id`, mdsvr hashes the payload — edit the quiz, get a new hash, new stats."
    }
  ]
}
```

## Quick Example

````markdown
```quiz
{
  "id": "asyncio-basics",
  "title": "Quick check",
  "mode": "exam",
  "questions": [
    {
      "type": "single",
      "question": "Which function is the standard entrypoint for a coroutine?",
      "options": ["`asyncio.run()`", "`asyncio.exec()`", "`asyncio.start()`"],
      "answer": 0,
      "explanation": "`asyncio.run()` has been the recommended API since Python 3.7."
    },
    {
      "type": "true-false",
      "question": "`async`/`await` is syntax owned by the asyncio library.",
      "answer": false,
      "explanation": "It is language syntax; asyncio is just one consumer."
    }
  ]
}
```
````

## Quiz Fields

| Field       | Type                   | Default   | Description                                                                                                                      |
| ----------- | ---------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`        | `string`               | auto-hash | Stable identifier for score history. When omitted, mdsvr hashes the payload — editing the quiz resets stored stats.              |
| `title`     | `string`               | `"Quiz"`  | Title shown in the quiz header.                                                                                                  |
| `mode`      | `"exam" \| "practice"` | `"exam"`  | `exam`: one **Check answers** button grades everything. `practice`: each question has its own check button for instant feedback. |
| `questions` | `array`                | required  | At least one question (see types below).                                                                                         |

## Question Types

| Type         | Required fields                      | `answer`                                   | UI                  |
| ------------ | ------------------------------------ | ------------------------------------------ | ------------------- |
| `single`     | `question`, `options` (≥2), `answer` | `number` — 0-based index of correct option | radio               |
| `multiple`   | `question`, `options` (≥2), `answer` | `number[]` — all correct indices           | checkbox            |
| `true-false` | `question`, `answer`                 | `boolean`                                  | True/False          |
| `self-check` | `question`, `answer`                 | `string` — model answer                    | reveal + self-grade |

Every question may also have an optional `explanation` (inline markdown), shown after grading.

Question text, options, explanations, and self-check model answers support **inline markdown** — `` `code` ``, `**bold**`, `*italic*`, links. Raw HTML is not allowed.

## Scoring

- All-or-nothing per question — a `multiple` question only counts if the exact correct set is selected.
- `self-check` questions count toward the total; the learner reports correct/incorrect themselves.
- The result panel shows `correct/total`, a percentage, a per-type breakdown, and history (`Best: x/y · n attempts`).
- Stats are stored under `mdsvr-quiz:<id>` in `localStorage`. Give the quiz a stable `id` if you want history to survive content edits.

> [!WARNING]
> Answers are embedded in the page source (view-source reveals them). Quizzes are self-study tools on the honor system — not a secure assessment.

## Validation

`--validate-md` checks every ` ```quiz ` block against the schema and reports `invalid-quiz` errors with the fence's line number — malformed JSON, missing fields, and out-of-range answer indices are all caught before publish. Invalid blocks render as an inline error callout instead of breaking the page.

## In MDX

The same ` ```quiz ` fence works in `.mdx` files. You can also embed a quiz directly with the `<Quiz>` component:

```mdx
<Quiz source='{"questions": [{"type": "true-false", "question": "Sky is blue.", "answer": true}]}' />
```

Disable it per-site with `"mdx.components": { "Quiz": false }` — quiz fences then render as plain code blocks.

## Notes & Limitations

- **No JavaScript**: questions and options still render as a readable form; grading just does nothing.
- **Search**: quiz JSON is fenced code, so questions and answers do not appear in the search index.
- **EPUB export**: `mdsvr-to-epub` converts quiz blocks into a static numbered Q&A with an answer key.
