// Interactive quiz blocks: ```quiz fenced blocks contain JSON describing a
// self-study quiz. The renderer emits a form-like HTML structure with answers
// stored in data-answer attributes (hidden via CSS, honor-system — this is not
// a secure assessment). Client-side JS in the page template grades answers and
// tracks per-user stats in localStorage.
import MarkdownIt from "markdown-it";
import { z } from "zod";

const BaseQuestion = z.object({
  question: z.string().min(1),
  explanation: z.string().optional(),
});

const SingleQuestion = BaseQuestion.extend({
  type: z.literal("single"),
  options: z.array(z.string()).min(2),
  answer: z.number().int().nonnegative(),
});

const MultipleQuestion = BaseQuestion.extend({
  type: z.literal("multiple"),
  options: z.array(z.string()).min(2),
  answer: z.array(z.number().int().nonnegative()).min(1),
});

const TrueFalseQuestion = BaseQuestion.extend({
  type: z.literal("true-false"),
  answer: z.boolean(),
});

const SelfCheckQuestion = BaseQuestion.extend({
  type: z.literal("self-check"),
  answer: z.string().min(1),
});

export const QuizSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  mode: z.enum(["exam", "practice"]).default("exam"),
  questions: z
    .array(
      z.discriminatedUnion("type", [
        SingleQuestion,
        MultipleQuestion,
        TrueFalseQuestion,
        SelfCheckQuestion,
      ]),
    )
    .min(1),
});

export type Quiz = z.infer<typeof QuizSchema>;
export type QuizQuestion = Quiz["questions"][number];

export interface QuizParseResult {
  quiz?: Quiz;
  error?: string;
}

/**
 * Parse quiz JSON into a validated Quiz. Returns a human-readable error
 * message (JSON syntax or zod schema summary) instead of throwing.
 */
export function parseQuiz(json: string): QuizParseResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (e) {
    return { error: `Invalid JSON: ${(e as Error).message}` };
  }

  const result = QuizSchema.safeParse(data);
  if (!result.success) {
    const summary = result.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
      .join("; ");
    return { error: `Invalid quiz schema: ${summary}` };
  }

  const quiz = result.data;
  for (const [i, q] of quiz.questions.entries()) {
    if (q.type === "single" && q.answer >= q.options.length) {
      return {
        error: `Invalid quiz schema: questions.${i}.answer index ${q.answer} is out of range (${q.options.length} options)`,
      };
    }
    if (q.type === "multiple") {
      const bad = q.answer.find((a) => a >= q.options.length);
      if (bad !== undefined) {
        return {
          error: `Invalid quiz schema: questions.${i}.answer index ${bad} is out of range (${q.options.length} options)`,
        };
      }
    }
  }

  return { quiz };
}

/**
 * Stable hash for auto-generated quiz ids. FNV-1a 32-bit over the raw
 * payload, so editing the quiz content resets its localStorage stats.
 */
export function quizHash(payload: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// Separate inline-only renderer for question/option/explanation text.
// html:false keeps raw HTML out of quiz content; linkify still autolinks URLs.
let inlineMd: MarkdownIt | null = null;
export function renderQuizInline(text: string): string {
  inlineMd ??= new MarkdownIt({ html: false, linkify: true });
  return inlineMd.renderInline(text);
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return text.replace(/[&<>"']/g, (c) => map[c] || c);
}

function renderOptionInputs(
  q: Extract<QuizQuestion, { type: "single" | "multiple" }>,
  quizId: string,
  qIndex: number,
): string {
  const inputType = q.type === "single" ? "radio" : "checkbox";
  const name = `quiz-${quizId}-q${qIndex}`;
  const options = q.options
    .map(
      (opt, i) =>
        `      <label class="quiz-option"><input type="${inputType}" name="${escapeHtml(name)}" value="${i}"> <span>${renderQuizInline(opt)}</span></label>`,
    )
    .join("\n");
  return `    <div class="quiz-options">\n${options}\n    </div>`;
}

function renderQuestion(
  q: QuizQuestion,
  quizId: string,
  qIndex: number,
  mode: "exam" | "practice",
): string {
  const explanation = q.explanation
    ? `    <div class="quiz-explanation" hidden>${renderQuizInline(q.explanation)}</div>\n`
    : "";

  const practiceButton =
    mode === "practice" && q.type !== "self-check"
      ? `    <button type="button" class="quiz-practice-check">Check</button>\n`
      : "";

  const head = `  <div class="quiz-question" data-qtype="${q.type}"`;
  const text = `    <div class="quiz-question-text">${renderQuizInline(q.question)}</div>\n`;

  switch (q.type) {
    case "single":
    case "multiple": {
      const answer = Array.isArray(q.answer) ? q.answer.join(",") : q.answer;
      return `${head} data-answer="${answer}">\n${text}${renderOptionInputs(q, quizId, qIndex)}\n${explanation}${practiceButton}  </div>\n`;
    }
    case "true-false": {
      const name = `quiz-${quizId}-q${qIndex}`;
      return `${head} data-answer="${q.answer}">\n${text}    <div class="quiz-options">
      <label class="quiz-option"><input type="radio" name="${escapeHtml(name)}" value="true"> <span>True</span></label>
      <label class="quiz-option"><input type="radio" name="${escapeHtml(name)}" value="false"> <span>False</span></label>
    </div>\n${explanation}${practiceButton}  </div>\n`;
    }
    case "self-check": {
      return `${head}>\n${text}    <button type="button" class="quiz-reveal">Show answer</button>
    <div class="quiz-model-answer" hidden>${renderQuizInline(q.answer)}</div>
    <div class="quiz-self-mark" hidden>
      <button type="button" data-mark="correct">I got it right</button>
      <button type="button" data-mark="incorrect">Not yet</button>
    </div>\n${explanation}  </div>\n`;
    }
  }
}

/**
 * Render a ```quiz fence payload to quiz HTML. Invalid input produces a
 * .quiz-error callout (the validator reports the same errors — rendering
 * never throws so a broken quiz can't take down the page).
 */
export function renderQuizBlock(json: string): string {
  const { quiz, error } = parseQuiz(json);
  if (error || !quiz) {
    return `<div class="quiz quiz-error">
  <strong>Invalid quiz block</strong>
  <div>${escapeHtml(error ?? "Unknown error")}</div>
</div>\n`;
  }

  const quizId = quiz.id ?? `q-${quizHash(json)}`;
  const mode = quiz.mode;
  const title = quiz.title ?? "Quiz";

  const questions = quiz.questions
    .map((q, i) => renderQuestion(q, quizId, i, mode))
    .join("");

  return `<div class="quiz" data-quiz-id="${escapeHtml(quizId)}" data-quiz-mode="${mode}">
  <div class="quiz-header">
    <span class="quiz-title">${renderQuizInline(title)}</span>
    <span class="quiz-progress">0/${quiz.questions.length}</span>
  </div>
${questions}  <div class="quiz-actions">
    <button type="button" class="quiz-check">Check answers</button>
    <button type="button" class="quiz-reset" hidden>Try again</button>
  </div>
  <div class="quiz-result" hidden></div>
</div>\n`;
}
