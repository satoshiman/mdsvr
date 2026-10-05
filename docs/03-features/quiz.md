# Interactive Quizzes

mdsvr renders ` ```quiz ` fenced blocks as interactive, self-grading quizzes. Questions, options, and answers are written as JSON; the reader sees a form, clicks **Check answers**, and gets instant feedback with a score. Results are stored per-user in `localStorage` — no backend required, works in static exports too.

Try it — this quiz is live:

```quiz
{
  "id": "mdsvr-quiz-feature-demo",
  "title": "Is this quiz working?",
  "mode": "practice",
  "questions": [
    {
      "type": "true-false",
      "question": "Quiz blocks are graded entirely in the browser.",
      "answer": true,
      "explanation": "No backend needed — answers are checked by client-side JavaScript and stats go to localStorage."
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
