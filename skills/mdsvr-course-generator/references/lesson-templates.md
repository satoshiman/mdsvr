# Lesson Templates

Templates use the mdsvr rules in `mdsvr-rules.md`. Replace placeholders; write the
section headings in the course language. Callouts use GitHub-style `> [!TYPE]`
syntax — every line of a callout needs the `>` prefix.

## Contents
1. Time estimation and ratio check
2. Course README
3. Chapter README
4. Lesson page
5. Expert Corner
6. Quiz page
7. Cheatsheet page
8. Capstone page

## 1. Time estimation and ratio check

Estimate each lesson in minutes:

- Theory time: reading and understanding the theory, examples, expert corner. Rough
  guide: 150 to 200 words per minute for explanatory text, plus time for code/diagram
  reading.
- Practice time: lab, exercises, quiz. Estimate how long a learner realistically needs
  to do them, not how long they take to read.

Build a table per chapter and total:

| Lesson | Theory (min) | Practice (min) |
|--------|--------------|----------------|

Overall ratio = sum theory : sum practice. Compare to the confirmed ratio. If off by
more than about 5 percentage points, add or trim labs/exercises or theory.

## 2. Course README

```markdown
---
title: "<Course Title>"
description: "<one sentence: who it is for and what they will be able to do>"
---

# <Course Title>

<2 to 3 sentences on the course goal and outcome.>

> [!NOTE]
> **Estimated time:** <total> (theory <x>, practice <y>) | **Level:** <level> | **Language:** <lang>

## Who this course is for
...

## What you will learn
- ...

## Syllabus
| Chapter | Topic | Theory | Practice |
|---------|-------|--------|----------|
| [1. <name>](./01-<slug>) | ... | ... | ... |

## How to study this course
1. Read the theory, then run the examples yourself.
2. Do the lab before reading the solution.
3. Read the Expert Corner: it is the fastest way to build real-world judgment.
4. Keep the chapter cheatsheets for revision.

Final cheatsheet: [Cheatsheet](./99-cheatsheet)
```

## 3. Chapter README

```markdown
---
title: "Chapter N: <name>"
description: "<what this chapter covers>"
---

# Chapter N: <name>

<Why this chapter matters, 2 sentences.>

## Lessons
| Lesson | Theory | Practice |
|--------|--------|----------|
| [N.1 <name>](./01-<slug>) | ... | ... |

## Chapter outcomes
- ...

Also: [Chapter quiz](./98-quiz) | [Chapter cheatsheet](./99-cheatsheet)
```

Only list quiz/cheatsheet links that exist.

## 4. Lesson page

```markdown
---
title: "N.M <Lesson Title>"
description: "<one sentence>"
---

# N.M <Lesson Title>

> [!NOTE]
> **Time:** <theory> min theory + <practice> min practice

## Learning objectives
After this lesson you can:
- ...

## Quick Review
(Include ONLY if the learner has prior knowledge to skim. Max about 5 minutes.)

> [!NOTE]
> <Short refresher of the excluded/known topic, just enough to follow this lesson.>

## Theory
### <Concept 1>
...
(Mermaid diagram where it clarifies; follow mdsvr-rules section 6.)

## Worked examples
### Example 1: <name>
<Code or scenario with explanation of WHY each step.>

## Hands-on lab
**Goal:** ...
**Prerequisites:** ...

1. Step ...
2. Step ...

> [!SUCCESS]
> Expected result: ...

> [!CAUTION]
> (Only for destructive or risky commands.)

## Exercises
1. <Exercise>
2. <Exercise>

<Solutions: place under "Solutions" heading, after exercises.>

### Solutions
1. ...

## Expert Corner
(see section 5)

## Quiz
(Only if the learner wanted lesson-level quizzes: 3 to 5 questions, see section 6.)

## Summary
- ...

## Next steps
- Next lesson: [N.M+1 <name>](./0X-<slug>)
```

Sizing: the lab and exercises scale with the confirmed practice level and ratio. A
practice-heavy course has multi-step labs; a theory-heavy course has short guided labs.

## 5. Expert Corner

Use a heading and mixed callouts. Pick the items that genuinely apply; do not pad.

```markdown
## Expert Corner

> [!TIP]
> **Must-master:** Master <X> first, because <reason in terms of impact on real work>.

> [!NOTE]
> **What experts do:** Experienced practitioners usually <habit or default>, because <reason>.

> [!TIP]
> **Trick:** <shortcut, command, setting, debugging move> — saves <what>.

> [!WARNING]
> **Common mistake:** Beginners often <mistake>. Instead, <fix>.

**Rule of thumb:** <heuristic for deciding quickly>.
```

Quality rules:
- Each item has a "because" (the meaning/impact), not just a directive.
- Prefer insights that are not obvious from the theory section.
- No fabricated statistics, quotes, or named-expert attributions.
- Mark version-specific advice with the version.

## 6. Quiz page

Only when the learner asked for quizzes. Mix recall, understanding, and apply-in-scenario
questions. Questions first, answers in a separate section so the learner can try first.

```markdown
---
title: "Chapter N Quiz"
description: "Self-check questions for chapter N."
---

# Chapter N Quiz

## Questions

**1.** <Question>
- A. ...
- B. ...
- C. ...
- D. ...

**2.** <Scenario question>
...

## Answers

> [!SUCCESS]
> 1. **B** — <why B is right and why the common wrong choice is wrong>
> 2. **C** — ...
```

Rules: distractors must be plausible; explanations teach, not just state the letter;
3 to 5 questions per lesson, 8 to 15 per chapter, adjust for chapter size.

## 7. Cheatsheet page

Dense and scannable. Chapter cheatsheet `99-cheatsheet.md`; final course cheatsheet at
the course root.

````markdown
---
title: "Chapter N Cheatsheet"
description: "Quick reference for chapter N."
---

# Chapter N Cheatsheet

## Key concepts
| Concept | One-line meaning | When to use |
|---------|------------------|-------------|

## Commands / syntax
```<lang>
# command: what it does
```

## Decision guide
| Situation | Use | Why |
|-----------|-----|-----|

## Expert checklist
- [ ] ...

## Pitfalls
- ...
````

The final course cheatsheet consolidates the chapter cheatsheets and adds a
"Top 10 things to remember" section.

## 8. Capstone page

Only if the learner wants a capstone.

```markdown
---
title: "Capstone Project"
description: "Apply everything in a realistic project."
---

# Capstone Project

## Scenario
## Requirements
## Milestones
1. ...
## Acceptance criteria
## Hints (spoiler-light)
## Reference solution outline
```
