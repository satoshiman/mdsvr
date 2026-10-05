# Interactive Quiz Blocks

mdsvr renders ` ```quiz ` fenced blocks as interactive, client-graded quizzes.
The block contains a single JSON object — the same contract works in `.md` and
`.mdx` files. `--validate-md` checks the schema, so a malformed block is caught
before publish.

## Quick example

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

## Quiz-level fields

| Field   | Type                   | Default   | Notes |
| ------- | ---------------------- | --------- | ----- |
| `id`    | `string`               | auto-hash | Stable id for per-user score history. Omit it unless you need a stable id across edits — when missing, mdsvr hashes the payload, so editing questions resets stored stats. |
| `title` | `string`               | `"Quiz"`  | Shown in the quiz header. |
| `mode`  | `"exam" \| "practice"` | `"exam"`  | `exam`: answer everything, then one "Check answers" button grades all. `practice`: each question has its own check button with instant feedback. |

## Question types

`questions` is an array (min 1). Each question is a discriminated union on `type`:

| Type         | Required fields                       | `answer`                                   | Rendered as |
| ------------ | ------------------------------------- | ------------------------------------------ | ----------- |
| `single`     | `question`, `options` (≥2), `answer`  | `number` — index of the correct option     | radio buttons |
| `multiple`   | `question`, `options` (≥2), `answer`  | `number[]` — all correct indices, non-empty | checkboxes |
| `true-false` | `question`, `answer`                  | `boolean`                                  | True / False radio |
| `self-check` | `question`, `answer`                  | `string` — model answer (inline markdown)  | "Show answer" + self-grade buttons |

Optional on every type:

- `explanation` — shown after grading. Use it to teach: say *why* the answer is
  right and why the tempting wrong one is wrong, not just which letter.

## Authoring rules

1. **Inline markdown works** in `question`, `options[]`, `explanation`, and the
   `self-check` answer: `` `code` ``, `**bold**`, `*italic*`, links. Raw HTML is
   stripped — do not rely on it.
2. **Indices are 0-based.** `answer: 0` is the first option. An out-of-range
   index fails validation.
3. **`multiple` is all-or-nothing.** The learner must select exactly the correct
   set — no partial credit. Keep the correct set small (2–3 options) so the
   question is fair.
4. **`self-check` counts toward the score.** The learner reads the model answer
   and reports correct/incorrect themselves. Write model answers short and
   checkable — one key idea, not an essay.
5. **Distractors must be plausible.** Wrong options should be common
   misconceptions, near-misses, or plausible-sounding alternatives — never joke
   options or "none of the above".
6. **Answers live in the page source.** Quizzes are self-study (honor system),
   not secure assessment. Do not use them for gated/exam content.

## Common mistakes

| ❌ Wrong | ✅ Correct | Why |
| -------- | ----------- | --- |
| `"answer": 3` with 3 options | `"answer": 2` | indices are 0-based |
| `"options": ["only one"]` | ≥ 2 options | schema requires `min(2)` |
| missing `"type"` on a question | always set `type` | it is the discriminator |
| `"answer": "0"` (string) | `"answer": 0` | single/multiple answers are numbers |
| `"answer": []` for multiple | non-empty array | empty answer set is invalid |
| ` ```quiz ` with YAML inside | JSON only | the block is parsed as strict JSON — no comments, no trailing commas, quoted keys |
| raw HTML in question text | inline markdown | `html: false` — tags render as literal text |

## Behavior notes

- **Scoring:** all-or-nothing per question. Result panel shows `score/total`,
  percentage, per-type breakdown, and best/attempt history.
- **Stats:** per-user, stored in `localStorage` (`mdsvr-quiz:<id>`). Works in
  served and statically exported sites — grading is fully client-side.
- **Search:** quiz JSON does not enter the search index (fenced blocks are
  stripped) — questions and answers are not searchable.
- **EPUB export:** `mdsvr-to-epub` converts ` ```quiz ` blocks into a static
  numbered Q&A section with an answer key.
