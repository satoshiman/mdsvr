# Survey Guide

## Contents

1. Principles
2. Round 1: foundation questions
3. Round 2: contextual questions
4. How to derive contextual questions
5. Anti-patterns
6. Brief template

## 1. Principles

- Ask in two stages: Round 1 (fixed foundations), then Round 2 (derived from topic and
  Round 1 answers).
- Skip anything the user already stated.
- Prefer tappable options (`ask_user_question`) for choices; plain text for free-form.
- Max 3 questions per message. Short, plain wording. Match the user's language.
- Always provide a sensible default so the learner can answer "ok" and move on.

## 2. Round 1: foundation questions

### Q1. Theory : practice ratio (by learning time)

Options example:

- 80 : 20 (mostly understanding, light practice) (default)
- 60 : 40 (balanced)
- 40 : 60 (practice-heavy)
- Custom

Explain in one line that the ratio is measured in estimated study time.

### Q2. Existing knowledge and exclusions (free text)

Ask what the learner already knows well or does not want in the course. Explain the
behavior in one line: excluded topics get only a short "Quick Review" box, not a lesson.
Example: "Bạn đã rành Redis thì mình chỉ ôn nhanh khi cần, không đi sâu."

### Q3. Quiz preference

Options:

- Quiz at the end of every lesson
- Quiz at the end of every chapter (default)
- No quizzes

Quizzes are emitted as interactive ` ```quiz ` blocks (see
`lesson-templates.md` §6): mdsvr grades them in the browser and tracks the
learner's best score. Lesson quizzes default to `"mode": "practice"`; chapter
quizzes to `"mode": "exam"`.

### Q4. Language (only if undetermined)

State the detected language and ask to confirm or change.

## 3. Round 2: contextual questions

Two mandatory axes. Ask them per major area of the topic, not as one global question.

### Axis A: depth of knowledge

Offer depth levels tailored to the topic. Generic ladder to adapt:

1. Concepts and when to use
2. Working proficiency (use it correctly day to day)
3. Internals (how it works under the hood)
4. Production and tuning (scale, failure modes, optimization)

Adapt labels to the topic. Example for a database: "chỉ cần biết dùng", "hiểu cơ chế
index và query planner", "tối ưu production".

### Axis B: practice

Ask about the combination that fits the topic:

- Lab style: copy-paste guided / fill-in-the-blank / build from a spec
- Environment: local machine / Docker / cloud account (check what the learner can access)
- Exercise difficulty progression
- Capstone project: yes/no, and what kind of real-world scenario
- Amount of practice per lesson in line with the confirmed ratio

## 4. How to derive contextual questions

Before asking, silently produce:

1. The list of 4 to 8 major areas of the topic.
2. Which areas overlap with what the learner already knows (Q2).
3. Where a real fork in the course design exists (a decision that changes the content).

Then write questions that mention concrete names from steps 1 to 3.

Good:

- "Khóa Kafka có 3 mảng: producer/consumer, partition/replication, vận hành. Bạn muốn
  đào sâu mảng nào nhất? Vì bạn rành Redis, mình có thể đối chiếu Kafka với Redis
  Streams ở phần đầu, bạn có muốn không?"
- "Lab Docker: bạn muốn dựng 1 app web + DB, hay một hệ nhiều service có reverse proxy?"

Bad:

- "Bạn muốn học sâu đến mức nào?" (no topic context)
- "Bạn thích thực hành nhiều hay ít?" (already covered by Q1)

## 5. Anti-patterns

- Asking more than 2 rounds.
- Re-asking things the learner already answered.
- Questions that do not change the course design. Every question must influence
  syllabus, depth, or labs; if it does not, drop it.
- Long preambles. One framing sentence, then the question.

## 6. Brief template (Step 3)

```
Tóm tắt khóa học
- Chủ đề / mục tiêu: ...
- Ngôn ngữ: ...
- Thư mục output: ...
- Tỷ lệ thời lượng lý thuyết : thực hành: ...
- Đã biết (ôn nhanh): ...
- Loại trừ: ...
- Độ sâu theo mảng: ...
- Thực hành: kiểu lab, môi trường, capstone
- Quiz: ...
- Luôn có: Góc chuyên gia (tips, tricks) + cheatsheet mỗi chương
- Ước tính tổng thời lượng: ...
Bạn xác nhận hoặc chỉnh sửa giúp mình nhé.
```
