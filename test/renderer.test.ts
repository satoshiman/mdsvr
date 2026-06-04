import { describe, it } from "node:test";
import assert from "node:assert";
import { renderMarkdown } from "../src/renderer/markdown.js";
import type { Settings } from "../src/settings/index.js";

describe("renderer", () => {
  const settings: Settings = {
    files: {
      extensions: {
        serve: [".md"],
        block: [],
        hidden: [],
      },
      indexFiles: [],
      ignorePatterns: [],
    },
    navigation: {
      sidebar: {
        enabled: true,
        autoGenerate: true,
        showFileCount: false,
        collapsible: true,
        defaultOpen: true,
      },
      breadcrumbs: true,
      prevNextLinks: true,
      tocEnabled: true,
      tocMaxDepth: 3,
      editOnGithub: {
        enabled: false,
        branch: "main",
        docsDir: "docs/",
      },
    },
    mdx: {
      enabled: false,
      components: {},
      remarkPlugins: [],
      rehypePlugins: [],
    },
    seo: {
      titleTemplate: "%s",
      noIndex: false,
      generateSitemap: true,
      generateRssFeed: false,
      twitterCard: "summary",
    },
    site: {
      title: "Test",
      description: "Test",
      language: "en",
    },
    search: {
      enabled: true,
      placeholder: "Search",
      maxResults: 10,
    },
    appearance: {
      defaultTheme: "system",
      allowThemeToggle: true,
      accentColor: "#0969da",
      codeTheme: {
        light: "lightfair",
        dark: "github-dark",
      },
      fontFamily: {},
    },
    footer: {
      text: "Test",
      links: [],
    },
  };

  it("renders basic markdown", () => {
    const md = "# Hello\n\nThis is **bold** and _italic_.";
    const result = renderMarkdown(md, settings);
    assert.ok(result.html.includes("<h1"));
    assert.ok(result.html.includes("Hello"));
    assert.ok(
      result.html.includes("<strong>bold</strong>") ||
        result.html.includes("<strong>"),
    );
    assert.ok(
      result.html.includes("<em>italic</em>") || result.html.includes("<em>"),
    );
  });

  it("renders code blocks", () => {
    const md = "```js\nconst x = 1;\n```";
    const result = renderMarkdown(md, settings);
    assert.ok(result.html.includes("<pre>"));
    assert.ok(result.html.includes("<code"));
  });

  it("auto-links URLs", () => {
    const md = "Visit https://example.com for more info.";
    const result = renderMarkdown(md, settings);
    assert.ok(result.html.includes('href="https://example.com"'));
  });

  it("renders tables", () => {
    const md = "| a | b |\n|---|---|\n| 1 | 2 |";
    const result = renderMarkdown(md, settings);
    assert.ok(result.html.includes("<table>"));
    assert.ok(result.html.includes("<tr>"));
  });

  it("extracts TOC with proper hierarchy", () => {
    const md = "# H1\n\n## H2-1\n\n### H3-1\n\n## H2-2\n\n### H3-2";
    const result = renderMarkdown(md, settings);
    assert.ok(result.toc.length === 5);
    assert.strictEqual(result.toc[0].level, 1);
    assert.strictEqual(result.toc[0].text, "H1");
    assert.strictEqual(result.toc[1].level, 2);
    assert.strictEqual(result.toc[1].text, "H2-1");
    assert.strictEqual(result.toc[2].level, 3);
    assert.strictEqual(result.toc[2].text, "H3-1");
    assert.strictEqual(result.toc[3].level, 2);
    assert.strictEqual(result.toc[3].text, "H2-2");
    assert.strictEqual(result.toc[4].level, 3);
    assert.strictEqual(result.toc[4].text, "H3-2");
  });
});
