import { describe, it } from "node:test";
import assert from "node:assert";
import { wrapHtml } from "../src/template.js";

describe("template", () => {
  it("wraps markdown body in HTML", () => {
    const html = wrapHtml({
      title: "Test",
      body: "<p>Hello World</p>",
      filePath: "/docs/test.md",
    });

    assert.ok(html.includes("<!DOCTYPE html>"));
    assert.ok(html.includes("<title>Test</title>"));
    assert.ok(html.includes("<p>Hello World</p>"));
    assert.ok(html.includes("mdsvr")); // header logo
  });

  it("escapes HTML in title", () => {
    const html = wrapHtml({
      title: "Test <script>",
      body: "<p>content</p>",
      filePath: "/test.md",
    });

    // Should not contain raw script tag
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });

  it("shows file path in header", () => {
    const html = wrapHtml({
      title: "Readme",
      body: "<h1>Title</h1>",
      filePath: "/docs/readme.md",
    });

    assert.ok(html.includes("/docs/readme.md"));
  });
});
