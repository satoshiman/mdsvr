---
name: mdsvr-course-generator
description: >
  Design and generate a complete, hands-on learning course as a multi-file Markdown
  set compatible with mdsvr (Markdown Server), personalized through a staged learner
  survey (theory/practice time ratio, existing knowledge, depth, practice level, quiz
  preference). Each lesson includes theory, examples, labs, exercises, quizzes and an
  "expert corner" (tips, tricks, cheatsheets). Use this skill whenever the user wants
  to create a course, curriculum, syllabus, learning roadmap, lesson series, tutorial
  series, training material or hands-on study documents, even if they do not mention
  mdsvr. Always trigger for: "tạo khóa học", "tạo giáo trình", "lộ trình học",
  "tài liệu học tập", "tài liệu thực hành", "bài giảng", "học X từ cơ bản đến nâng cao",
  "create a course", "learning path", "syllabus", "study guide", "tutorial series".
license: MIT
---

# mdsvr Course Generator

Create a personalized course as a set of `.md` files served by mdsvr.
The course is shaped by a **survey of the learner first**, never by a generic template.

## Core principles

1. **Survey before writing.** Never generate lessons before the brief is confirmed.
2. **Context-driven questions.** Round 2 questions MUST be derived from the topic and the
   learner's Round 1 answers. Generic questions are a failure.
3. **Time-based ratio.** The theory : practice ratio is measured by estimated learning
   time, not by number of lessons or word count.
4. **Expert perspective.** Every lesson teaches what experts prioritize, not just facts.
5. **No artificial limits.** Course size follows the requested knowledge scope. Only
   shorten when the user explicitly asks to condense.

## Reference files (read when needed)

| File | Read when |
|------|-----------|
| `references/mdsvr-rules.md` | Before writing ANY file. Contains the mdsvr file, link, heading, frontmatter, callout and Mermaid rules |
| `references/survey-guide.md` | Starting Step 1 and Step 2 (question bank and how to derive contextual questions) |
| `references/lesson-templates.md` | Step 4 and Step 5 (syllabus, lesson, quiz, expert corner, cheatsheet templates) |

If the environment also has the `markdown-for-mdsvr` skill, read it too and prefer it
where it is more detailed — especially `rules/mermaid.md` for the full Mermaid syntax
reference. If not, `references/mdsvr-rules.md` is sufficient. Never skip the rules
because another skill is missing.

---

## Step 0 — Capture the request

Extract from the user's message what is already known: topic, goal, audience, language,
output location, constraints. Do NOT ask about anything already stated.

**Language:** use the language the user requests. If none is requested, use the language
the user is writing in, and confirm it in the Step 3 brief.

**Output location:** if the user specified a directory, use it. Otherwise default to
`./<course-slug>/` in the current working directory and confirm it in the Step 3 brief.

If the topic is version-sensitive (frameworks, tools, cloud services) and web search is
available, check the current stable version before designing the course.

## Step 1 — Survey round 1: foundations

Read `references/survey-guide.md`. Ask these four things (adapt wording to the topic):

1. **Theory : practice ratio by learning time** (default suggestion 80 : 20).
2. **Existing knowledge** and **topics to exclude or only skim**.
3. **Quiz format**: does the learner want quizzes at the end of each chapter/lesson?
4. **Language** only if not determinable from Step 0.

Use `ask_user_question` for choice questions when available (max 3 questions per call,
2 to 4 options each). Use plain text for free-form answers such as existing knowledge.
If the tool is unavailable, ask in text. Keep this round short.

## Step 2 — Survey round 2: depth and practice (contextual)

Based on the topic AND round 1 answers, ask questions that only make sense for THIS
learner. Examples of the required specificity:

- Topic "Kafka", learner already knows Redis: "Có muốn so sánh Kafka với Redis Streams
  để tận dụng kiến thức Redis không?"
- Topic "Docker", learner said they want to deploy a real app: "Lab nên dựng stack gì:
  web + DB hay microservices nhiều service?"

Two axes are mandatory:

- **Depth**: how deep per area (concept level, internals, production/tuning, source
  level). Ask per major area of the topic, not one global question.
- **Practice**: lab style (copy-paste guided, fill-in-the-blank, build from spec),
  environment (local, Docker, cloud), exercise difficulty, whether a capstone project is
  wanted.

Ask at most 3 questions per round. If answers raise new ambiguities, run one more short
round, then stop. Do not interrogate.

## Step 3 — Confirm the brief (gate)

Present a compact brief and WAIT for the learner's confirmation:

- Topic, goal, language
- Output directory
- Time ratio theory : practice
- Excluded / "quick review" topics
- Depth per area
- Practice style and environment
- Quiz yes/no and format
- Expert corner and cheatsheets (always included, state it)
- Estimated total learning time

Proceed only after explicit confirmation. If the learner edits the brief, update and
re-confirm briefly.

## Step 4 — Design the syllabus

Use the syllabus template in `references/lesson-templates.md`.

1. Define chapters and lessons following a logical learning progression.
2. Assign each lesson an estimated time split: theory minutes and practice minutes.
3. Check the total ratio against the confirmed ratio. Adjust lesson content until the
   overall split is within about 5 percentage points of the target.
4. Excluded knowledge becomes a **Quick Review** block (about 5 minutes max) at the start
   of the chapter that needs it. Never a full lesson.
5. Decide where cheatsheets go: one per chapter plus one final course cheatsheet.
6. Show the syllabus tree and time table to the learner. Continue immediately unless the
   learner asked to review it first. If the learner changes the scope, redo this step.

## Step 5 — Generate content

Read `references/mdsvr-rules.md` and `references/lesson-templates.md` first.

Write files under the confirmed output directory. Write final content only, no
placeholders. For large courses, write chapter by chapter and keep terminology, naming,
and example projects consistent across files.

Every lesson contains, in order:

1. Learning objectives
2. Quick Review (only when the learner has prior knowledge to skim)
3. Theory
4. Worked examples
5. Hands-on lab (size according to the confirmed practice level)
6. Exercises with solutions
7. Expert Corner (see below)
8. Quiz (only if the learner wanted it)
9. Summary and Next Steps

### Expert Corner (mandatory in every lesson)

Teach like a practitioner sharing hard-won knowledge. Include a mix of:

- **Must-master:** what to master and why it matters ("Nên nắm vững X vì ...").
- **What experts do:** habits and defaults seasoned engineers/practitioners follow
  ("Chuyên gia thường ...").
- **Tips and tricks:** shortcuts, productivity moves, debugging tricks.
- **Common mistakes:** what beginners get wrong and how to avoid it.
- **Rules of thumb:** heuristics for deciding quickly.

Accuracy rule: only state practices you are confident are real and current. Do not invent
statistics, quotes, or attribute claims to named experts. Phrase as "thực tế thường
thấy" or "nhiều kỹ sư có kinh nghiệm cho rằng" when it is a general practice. Flag
anything version-specific.

### Cheatsheets (mandatory)

One at the end of each chapter and one final course cheatsheet in `99-cheatsheet.md`.
Dense, scannable, with commands, syntax, decision tables, and "when to use what".

## Step 6 — Validate and deliver

Before delivering, check against `references/mdsvr-rules.md` "Final checklist":
file names, links (relative, no `.md`), frontmatter, H1 per page, heading hierarchy,
callouts, Mermaid syntax.

Then reply in chat with:

1. The file tree and the output path.
2. How to serve: `npx mdsvr ./<course-slug>` or `mdsvr ./<course-slug>`.
3. Page count, total estimated learning time, and the actual theory : practice
   time split.

Keep the final message short. The course content lives in the files.
