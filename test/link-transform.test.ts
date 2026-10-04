import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  convertMarkdownLinks,
  createLinkResolver,
} from "../src/link-transform.js";

describe("link-transform", () => {
  let rootDir: string;

  before(async () => {
    // Layout:
    //   guide.md
    //   deep/page.md         (links out from /deep/)
    //   sub/README.md        (index file → /sub/)
    //   noindex/             (directory without index → auto-index page)
    //   "sp ace/file name.md" (unicode/space encoding)
    //   ext.mdx              (mdx doc)
    //   assets/pic.png       (non-doc asset)
    rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-links-"));
    await fs.writeFile(path.join(rootDir, "guide.md"), "# Guide\n");
    await fs.writeFile(path.join(rootDir, "ext.mdx"), "# Ext\n");
    await fs.mkdir(path.join(rootDir, "deep"));
    await fs.writeFile(path.join(rootDir, "deep", "page.md"), "# Page\n");
    await fs.mkdir(path.join(rootDir, "sub"));
    await fs.writeFile(path.join(rootDir, "sub", "README.md"), "# Sub\n");
    await fs.mkdir(path.join(rootDir, "idx"));
    await fs.writeFile(path.join(rootDir, "idx", "index.md"), "# Idx\n");
    await fs.mkdir(path.join(rootDir, "noindex"));
    await fs.writeFile(path.join(rootDir, "noindex", "a.md"), "# A\n");
    await fs.mkdir(path.join(rootDir, "sp ace"));
    await fs.writeFile(
      path.join(rootDir, "sp ace", "file name.md"),
      "# Spaced\n",
    );
    await fs.mkdir(path.join(rootDir, "assets"));
    await fs.writeFile(path.join(rootDir, "assets", "pic.png"), "PNG");
  });

  after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  function ctx(sourceDirUrlPath = "/") {
    return {
      sourceDirUrlPath,
      rootDir,
      resolveFile: createLinkResolver(),
    };
  }

  describe("context-aware rebasing", () => {
    it("rebases relative .md links against the source directory", () => {
      const { html, warnings } = convertMarkdownLinks(
        '<a href="./page.md">P</a>',
        ctx("/deep"),
      );
      assert.strictEqual(html, '<a href="/deep/page/">P</a>');
      assert.deepStrictEqual(warnings, []);
    });

    it("resolves .. traversal within the docs root", () => {
      const { html } = convertMarkdownLinks(
        '<a href="../guide.md">G</a>',
        ctx("/deep"),
      );
      assert.strictEqual(html, '<a href="/guide/">G</a>');
    });

    it("collapses README.md/index.md links to the directory route", () => {
      const { html: readme } = convertMarkdownLinks(
        '<a href="../sub/README.md">S</a>',
        ctx("/deep"),
      );
      assert.strictEqual(readme, '<a href="/sub/">S</a>');
      const { html: index } = convertMarkdownLinks(
        '<a href="../idx/index.md">S</a>',
        ctx("/deep"),
      );
      assert.strictEqual(index, '<a href="/idx/">S</a>');
    });

    it("resolves directory links to the auto-index URL", () => {
      const { html } = convertMarkdownLinks(
        '<a href="../noindex">N</a>',
        ctx("/deep"),
      );
      assert.strictEqual(html, '<a href="/noindex/">N</a>');
    });

    it("resolves extension-less links to .mdx files", () => {
      const { html } = convertMarkdownLinks(
        '<a href="../ext">E</a>',
        ctx("/deep"),
      );
      assert.strictEqual(html, '<a href="/ext/">E</a>');
    });

    it("preserves anchors and query strings", () => {
      const { html } = convertMarkdownLinks(
        '<a href="../guide.md#setup">G</a><a href="../guide.md?x=1">Q</a>',
        ctx("/deep"),
      );
      assert.ok(html.includes('href="/guide/#setup"'));
      assert.ok(html.includes('href="/guide/?x=1"'));
    });

    it("percent-encodes unicode and space segments", () => {
      const { html } = convertMarkdownLinks(
        '<a href="../sp ace/file name.md">F</a>',
        ctx("/deep"),
      );
      assert.strictEqual(html, '<a href="/sp%20ace/file%20name/">F</a>');
    });

    it("keeps root-relative links and rebases them", () => {
      const { html } = convertMarkdownLinks(
        '<a href="/guide.md">G</a>',
        ctx("/deep"),
      );
      assert.strictEqual(html, '<a href="/guide/">G</a>');
    });

    it("encodes asset links without stripping extensions", () => {
      const { html } = convertMarkdownLinks(
        '<img src="../assets/pic.png">',
        ctx("/deep"),
      );
      assert.strictEqual(html, '<img src="/assets/pic.png">');
    });

    it("leaves external and special URLs untouched", () => {
      const html = [
        '<a href="https://x.com/a.md">e</a>',
        '<a href="mailto:a@b.c">m</a>',
        '<a href="tel:+1">t</a>',
        '<a href="#anchor">a</a>',
        '<a href="?q=1">q</a>',
        '<a href="//cdn.example.com/x">p</a>',
      ].join("");
      const { html: out, warnings } = convertMarkdownLinks(html, ctx());
      assert.strictEqual(out, html);
      assert.deepStrictEqual(warnings, []);
    });

    it("warns and keeps links whose target does not exist", () => {
      const { html, warnings } = convertMarkdownLinks(
        '<a href="./missing.md">M</a>',
        ctx("/deep"),
      );
      assert.strictEqual(html, '<a href="./missing.md">M</a>');
      assert.strictEqual(warnings.length, 1);
      assert.strictEqual(warnings[0].reason, "missing");
    });

    it("clamps .. traversal at the docs root (route space)", () => {
      // ../../../outside.md resolves to /outside.md — inside the site but
      // missing on disk → "missing" warning, link kept.
      const { html, warnings } = convertMarkdownLinks(
        '<a href="../../../outside.md">O</a>',
        ctx("/deep"),
      );
      assert.strictEqual(html, '<a href="../../../outside.md">O</a>');
      assert.strictEqual(warnings.length, 1);
      assert.strictEqual(warnings[0].reason, "missing");
      assert.strictEqual(warnings[0].resolvedUrlPath, "/outside.md");
    });

    it("rewrites raw markdown link syntax outside code blocks", () => {
      const { html } = convertMarkdownLinks(
        "Text [x](./page.md) more <pre><code>[y](./page.md)</code></pre>",
        ctx("/deep"),
      );
      assert.ok(html.includes("[x](/deep/page/)"));
      assert.ok(html.includes("[y](./page.md)"));
    });
  });

  describe("legacy mode (no context)", () => {
    it("only strips .md/.mdx extensions", () => {
      const { html } = convertMarkdownLinks(
        '<a href="./guide.md#x">G</a><a href="https://e.com/a.md">E</a>',
      );
      assert.ok(html.includes('href="./guide#x"'));
      assert.ok(html.includes('href="https://e.com/a.md"'));
    });
  });
});
