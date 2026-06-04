import { describe, it } from "node:test";
import assert from "node:assert";
import { renderMarkdown } from "../dist/renderer.js";

describe("renderer", () => {
  it("renders basic markdown", () => {
    const md = "# Hello\n\nThis is **bold** and _italic_.";
    const html = renderMarkdown(md);
    assert.ok(html.includes("<h1"));
    assert.ok(html.includes("Hello"));
    assert.ok(
      html.includes("<strong>bold</strong>") || html.includes("<strong>"),
    );
    assert.ok(html.includes("<em>italic</em>") || html.includes("<em>"));
  });

  it("renders code blocks", () => {
    const md = "```js\nconst x = 1;\n```";
    const html = renderMarkdown(md);
    assert.ok(html.includes("<pre>"));
    assert.ok(html.includes("<code"));
  });

  it("auto-links URLs", () => {
    const md = "Visit https://example.com for more info.";
    const html = renderMarkdown(md);
    assert.ok(html.includes('href="https://example.com"'));
  });

  it("renders tables", () => {
    const md = "| a | b |\n|---|---|\n| 1 | 2 |";
    const html = renderMarkdown(md);
    assert.ok(html.includes("<table>"));
    assert.ok(html.includes("<tr>"));
  });
});
