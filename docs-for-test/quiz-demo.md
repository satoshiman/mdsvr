---
title: Quiz Demo
description: Demo page for interactive quiz blocks — one question of each type.
---

# Quiz Demo

An exam-mode quiz covering all four question types:

```quiz
{
  "id": "quiz-demo-exam",
  "title": "All question types",
  "mode": "exam",
  "questions": [
    {
      "type": "single",
      "question": "Which language is `mdsvr` written in?",
      "options": ["Python", "TypeScript", "Go", "Rust"],
      "answer": 1,
      "explanation": "mdsvr is a Node.js CLI written in TypeScript (ESM)."
    },
    {
      "type": "multiple",
      "question": "Which features does mdsvr support out of the box?",
      "options": [
        "Mermaid diagrams",
        "A MySQL admin panel",
        "Full-text search",
        "Dark mode"
      ],
      "answer": [0, 2, 3],
      "explanation": "Mermaid, search, and theming ship built-in; there is no database admin feature."
    },
    {
      "type": "true-false",
      "question": "` ```quiz ` blocks work in both `.md` and `.mdx` files.",
      "answer": true
    },
    {
      "type": "self-check",
      "question": "In one sentence: how does mdsvr grade quizzes?",
      "answer": "Entirely client-side in the browser — answers live in `data-answer` attributes and stats go to `localStorage`, so it works in static exports too."
    }
  ]
}
```

And a practice-mode quiz where each question is checked immediately:

```quiz
{
  "title": "Practice mode",
  "mode": "practice",
  "questions": [
    {
      "type": "single",
      "question": "What is `2 + 2`?",
      "options": ["3", "4", "5"],
      "answer": 1,
      "explanation": "Basic arithmetic."
    },
    {
      "type": "true-false",
      "question": "Practice mode disables all options after checking.",
      "answer": true
    }
  ]
}
```
