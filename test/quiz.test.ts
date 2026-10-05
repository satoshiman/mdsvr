import { describe, it } from "node:test";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  QuizSchema,
  parseQuiz,
  renderQuizBlock,
  quizHash,
} from "../src/renderer/quiz.js";
import { renderMarkdown } from "../src/renderer/markdown.js";
import { renderMdx } from "../src/renderer/mdx.js";
import { validateMarkdown } from "../src/validator/index.js";
import { SettingsSchema } from "../src/settings/index.js";

const settings = SettingsSchema.parse({});

const VALID_QUIZ = JSON.stringify({
  id: "asyncio-basics",
  title: "Quick check",
  mode: "exam",
  questions: [
    {
      type: "single",
      question: "Which function runs a coroutine?",
      options: ["`asyncio.run()`", "`asyncio.exec()`", "`asyncio.start()`"],
      answer: 0,
      explanation: "`asyncio.run()` is the recommended entrypoint.",
    },
    {
      type: "multiple",
      question: "Which statements about `gather()` are true?",
      options: [
        "Runs awaitables concurrently",
        "Always uses multiple threads",
        "Returns results in order",
      ],
      answer: [0, 2],
    },
    {
      type: "true-false",
      question: "`async`/`await` is asyncio-only syntax.",
      answer: false,
    },
    {
      type: "self-check",
      question: "Explain how the event loop works.",
      answer: "It runs tasks until they await, then switches.",
    },
  ],
});

describe("quiz schema", () => {
  it("accepts all four question types", () => {
    const result = QuizSchema.safeParse(JSON.parse(VALID_QUIZ));
    assert.ok(result.success);
  });

  it("defaults mode to exam", () => {
    const result = QuizSchema.parse({
      questions: [{ type: "true-false", question: "q", answer: true }],
    });
    assert.strictEqual(result.mode, "exam");
  });

  it("rejects a question without type", () => {
    const result = parseQuiz(
      JSON.stringify({ questions: [{ question: "q", answer: 0 }] }),
    );
    assert.ok(result.error);
    assert.ok(result.error.includes("Invalid quiz schema"));
  });

  it("rejects single with fewer than 2 options", () => {
    const result = parseQuiz(
      JSON.stringify({
        questions: [
          { type: "single", question: "q", options: ["only"], answer: 0 },
        ],
      }),
    );
    assert.ok(result.error);
  });

  it("rejects answer index out of range", () => {
    const result = parseQuiz(
      JSON.stringify({
        questions: [
          {
            type: "single",
            question: "q",
            options: ["a", "b"],
            answer: 2,
          },
        ],
      }),
    );
    assert.ok(result.error);
    assert.ok(result.error.includes("out of range"));
  });

  it("rejects multiple answer index out of range", () => {
    const result = parseQuiz(
      JSON.stringify({
        questions: [
          {
            type: "multiple",
            question: "q",
            options: ["a", "b"],
            answer: [0, 5],
          },
        ],
      }),
    );
    assert.ok(result.error);
    assert.ok(result.error.includes("out of range"));
  });

  it("rejects empty questions array", () => {
    const result = parseQuiz(JSON.stringify({ questions: [] }));
    assert.ok(result.error);
  });
});

describe("renderQuizBlock", () => {
  it("renders a .quiz container with id, mode and questions", () => {
    const html = renderQuizBlock(VALID_QUIZ);
    assert.ok(html.includes('class="quiz"'));
    assert.ok(html.includes('data-quiz-id="asyncio-basics"'));
    assert.ok(html.includes('data-quiz-mode="exam"'));
    assert.strictEqual((html.match(/class="quiz-question"/g) || []).length, 4);
    assert.ok(html.includes('data-qtype="single"'));
    assert.ok(html.includes('data-qtype="multiple"'));
    assert.ok(html.includes('data-qtype="true-false"'));
    assert.ok(html.includes('data-qtype="self-check"'));
  });

  it("hides explanation and model answer until checked", () => {
    const html = renderQuizBlock(VALID_QUIZ);
    assert.ok(html.includes('class="quiz-explanation" hidden'));
    assert.ok(html.includes('class="quiz-model-answer" hidden'));
  });

  it("gives inputs unique names per question", () => {
    const html = renderQuizBlock(VALID_QUIZ);
    assert.ok(html.includes('name="quiz-asyncio-basics-q0"'));
    assert.ok(html.includes('name="quiz-asyncio-basics-q2"'));
  });

  it("renders radio for single, checkbox for multiple", () => {
    const html = renderQuizBlock(VALID_QUIZ);
    assert.ok(html.includes('type="radio"'));
    assert.ok(html.includes('type="checkbox"'));
  });

  it("auto-generates an id from the payload when missing", () => {
    const payload = JSON.stringify({
      questions: [{ type: "true-false", question: "q", answer: true }],
    });
    const html = renderQuizBlock(payload);
    assert.ok(html.includes(`data-quiz-id="q-${quizHash(payload)}"`));
  });

  it("renders inline markdown in question and options", () => {
    const html = renderQuizBlock(VALID_QUIZ);
    assert.ok(html.includes("<code>asyncio.run()</code>"));
  });

  it("neutralizes raw HTML in quiz content", () => {
    const html = renderQuizBlock(
      JSON.stringify({
        questions: [
          {
            type: "single",
            question: '<script>alert("x")</script>Pick one',
            options: ["a", "b"],
            answer: 0,
          },
        ],
      }),
    );
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });

  it("renders .quiz-error for invalid JSON without throwing", () => {
    const html = renderQuizBlock("{not json");
    assert.ok(html.includes("quiz-error"));
    assert.ok(html.includes("Invalid JSON"));
  });

  it("renders .quiz-error for schema violations", () => {
    const html = renderQuizBlock(JSON.stringify({ questions: "nope" }));
    assert.ok(html.includes("quiz-error"));
    assert.ok(html.includes("Invalid quiz schema"));
  });

  it("emits per-question check buttons in practice mode", () => {
    const html = renderQuizBlock(
      JSON.stringify({
        mode: "practice",
        questions: [
          {
            type: "single",
            question: "q",
            options: ["a", "b"],
            answer: 0,
          },
        ],
      }),
    );
    assert.ok(html.includes('data-quiz-mode="practice"'));
    assert.ok(html.includes('class="quiz-practice-check"'));
  });
});

describe("markdown integration", () => {
  it("renders ```quiz fences as quiz markup", () => {
    const md = "# Title\n\n```quiz\n" + VALID_QUIZ + "\n```\n";
    const result = renderMarkdown(md, settings);
    assert.ok(result.html.includes('class="quiz"'));
    assert.ok(result.html.includes('data-quiz-id="asyncio-basics"'));
    // Not wrapped in a code-block container or <pre>
    assert.ok(!result.html.includes("code-block-container"));
    assert.ok(!/<pre[^>]*>\s*<div class="quiz"/.test(result.html));
  });

  it("renders invalid quiz JSON as .quiz-error, not a code block", () => {
    const md = "```quiz\n{bad\n```\n";
    const result = renderMarkdown(md, settings);
    assert.ok(result.html.includes("quiz-error"));
    assert.ok(!result.html.includes("code-block-container"));
  });
});

describe("mdx integration", () => {
  it("renders ```quiz fences as quiz markup in .mdx", async () => {
    const mdx = "# Title\n\n```quiz\n" + VALID_QUIZ + "\n```\n";
    const result = await renderMdx(mdx, settings);
    assert.ok(result.html.includes('class="quiz"'));
    assert.ok(result.html.includes('data-quiz-id="asyncio-basics"'));
    assert.ok(result.html.includes('data-qtype="self-check"'));
  });

  it("does not transform quiz fences when Quiz component is disabled", async () => {
    const mdxSettings = SettingsSchema.parse({
      mdx: { enabled: true, components: { Quiz: false } },
    });
    const mdx = "```quiz\n" + VALID_QUIZ + "\n```\n";
    const result = await renderMdx(mdx, mdxSettings);
    assert.ok(!result.html.includes('class="quiz"'));
    // falls back to a regular code block
    assert.ok(result.html.includes("quiz"));
  });
});

describe("validator", () => {
  // validateMarkdown logs to stdout, which corrupts node:test IPC
  // serialization — silence it while validating.
  async function quietValidate(rootDir: string) {
    const orig = console.log;
    console.log = () => {};
    try {
      return await validateMarkdown({
        rootDir,
        checkLinks: false,
        checkStructure: false,
        checkAssets: false,
      });
    } finally {
      console.log = orig;
    }
  }

  it("flags invalid quiz JSON with the fence line number", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-quiz-"));
    try {
      await fs.writeFile(
        path.join(rootDir, "page.md"),
        "# Page\n\nText.\n\n```quiz\n{broken json\n```\n",
      );
      const result = await quietValidate(rootDir);
      const err = result.errors.find((e) => e.type === "invalid-quiz");
      assert.ok(err, "expected an invalid-quiz error");
      assert.strictEqual(err.line, 5);
      assert.ok(err.message.includes("Invalid JSON"));
    } finally {
      await fs.rm(rootDir, { recursive: true, force: true });
    }
  });

  it("flags schema violations and out-of-range answers", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-quiz-"));
    try {
      await fs.writeFile(
        path.join(rootDir, "page.md"),
        "# Page\n\n```quiz\n" +
          JSON.stringify({
            questions: [
              {
                type: "single",
                question: "q",
                options: ["a", "b"],
                answer: 9,
              },
            ],
          }) +
          "\n```\n",
      );
      const result = await quietValidate(rootDir);
      const err = result.errors.find((e) => e.type === "invalid-quiz");
      assert.ok(err);
      assert.ok(err.message.includes("out of range"));
    } finally {
      await fs.rm(rootDir, { recursive: true, force: true });
    }
  });

  it("accepts valid quiz blocks", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-quiz-"));
    try {
      await fs.writeFile(
        path.join(rootDir, "page.md"),
        "# Page\n\n```quiz\n" + VALID_QUIZ + "\n```\n",
      );
      const result = await quietValidate(rootDir);
      assert.ok(!result.errors.some((e) => e.type === "invalid-quiz"));
    } finally {
      await fs.rm(rootDir, { recursive: true, force: true });
    }
  });

  it("ignores quiz examples inside longer example fences", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-quiz-"));
    try {
      await fs.writeFile(
        path.join(rootDir, "page.md"),
        "# Page\n\n````markdown\n```quiz\n{not json\n```\n````\n",
      );
      const result = await quietValidate(rootDir);
      assert.ok(!result.errors.some((e) => e.type === "invalid-quiz"));
    } finally {
      await fs.rm(rootDir, { recursive: true, force: true });
    }
  });
});
