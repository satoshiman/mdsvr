import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getOgImagePath,
  getOgImageUrl,
  loadOgFonts,
} from "../src/og/generator.js";
import {
  extractDependencies,
  generateOgFilename,
  type OgState,
} from "../src/og/incremental.js";

describe("og generator", () => {
  describe("getOgImagePath", () => {
    it("returns index.jpg for root path", () => {
      const result = getOgImagePath("/", "/out/public/og", "jpg", "");
      assert.strictEqual(result, "/out/public/og/index.jpg");
    });

    it("returns index.jpg for root path with basePath", () => {
      const result = getOgImagePath("/docs", "/out/public/og", "jpg", "/docs");
      assert.strictEqual(result, "/out/public/og/index.jpg");
    });

    it("returns nested index.jpg for subdirectory", () => {
      const result = getOgImagePath(
        "/docs/3.-features",
        "/out/public/og",
        "jpg",
        "/docs",
      );
      assert.strictEqual(result, "/out/public/og/3.-features/index.jpg");
    });
  });

  describe("getOgImageUrl", () => {
    it("returns /public/assets/og/index.jpg for root", () => {
      const result = getOgImageUrl("", "", "jpg");
      assert.strictEqual(result, "/public/assets/og/index.jpg");
    });

    it("returns basePath public/assets/og/index.jpg for root with basePath", () => {
      const result = getOgImageUrl("/docs/", "/docs", "jpg");
      assert.strictEqual(result, "/docs/public/assets/og/index.jpg");
    });

    it("returns nested public/assets/og url for subdirectory", () => {
      const result = getOgImageUrl("/docs/3.-features", "/docs", "jpg");
      assert.strictEqual(
        result,
        "/docs/public/assets/og/3.-features/index.jpg",
      );
    });
  });

  describe("loadOgFonts", () => {
    it("registers the vietnamese fallback under a distinct font name", async () => {
      // Satori resolves a single engine per font name, so the vietnamese
      // subset must use a different name to act as a per-glyph fallback.
      const fonts = await loadOgFonts("Inter", [400], {
        primary: async () => Buffer.from("latin-font"),
        vietnamese: async () => Buffer.from("vietnamese-font"),
      });
      assert.strictEqual(fonts.length, 2);
      assert.strictEqual(fonts[0].name, "Inter");
      assert.strictEqual(fonts[0].weight, 400);
      assert.strictEqual(fonts[1].name, "Inter-vietnamese");
      assert.strictEqual(fonts[1].weight, 400);
      assert.notStrictEqual(fonts[0].name, fonts[1].name);
    });

    it("uses the custom font family as the fallback name prefix", async () => {
      const fonts = await loadOgFonts("MyFont", [700], {
        primary: async () => Buffer.from("latin-font"),
        vietnamese: async () => Buffer.from("vietnamese-font"),
      });
      assert.deepStrictEqual(
        fonts.map((f) => f.name),
        ["MyFont", "MyFont-vietnamese"],
      );
    });

    it("skips fonts that fail to load", async () => {
      const fonts = await loadOgFonts("Inter", [400, 700], {
        primary: async (_family, weight) =>
          weight === 400 ? Buffer.from("latin-font") : null,
        vietnamese: async () => null,
      });
      assert.strictEqual(fonts.length, 1);
      assert.strictEqual(fonts[0].name, "Inter");
      assert.strictEqual(fonts[0].weight, 400);
    });

    it("loads every requested weight", async () => {
      const fonts = await loadOgFonts("Inter", [400, 700, 800], {
        primary: async () => Buffer.from("latin-font"),
        vietnamese: async () => Buffer.from("vietnamese-font"),
      });
      assert.deepStrictEqual(
        fonts.map((f) => `${f.name}@${f.weight}`),
        [
          "Inter@400",
          "Inter-vietnamese@400",
          "Inter@700",
          "Inter-vietnamese@700",
          "Inter@800",
          "Inter-vietnamese@800",
        ],
      );
    });
  });

  describe("incremental OG export", () => {
    describe("extractDependencies", () => {
      it("extracts import statements", () => {
        const content = `
import { Component } from './component'
import { helper } from '../utils/helper'
`;
        const deps = extractDependencies(content);
        assert.deepStrictEqual(deps, ["./component", "../utils/helper"]);
      });

      it("extracts frontmatter includes", () => {
        const content = `
---
include: './partial.md'
reference: 'other.md'
---
# Content
`;
        const deps = extractDependencies(content);
        assert.deepStrictEqual(deps, ["./partial.md", "other.md"]);
      });

      it("returns empty array for content without dependencies", () => {
        const content = "# Just a heading\n\nSome content";
        const deps = extractDependencies(content);
        assert.deepStrictEqual(deps, []);
      });
    });

    describe("generateOgFilename", () => {
      it("generates filename for root README", () => {
        const result = generateOgFilename("/docs/README.md", "jpg");
        assert.strictEqual(result, "docs-readme-og.jpg");
      });

      it("generates filename for nested file", () => {
        const result = generateOgFilename("/docs/guides/setup.md", "jpg");
        assert.strictEqual(result, "docs-guides-setup-og.jpg");
      });

      it("generates filename for mdx file", () => {
        const result = generateOgFilename("/docs/component.mdx", "png");
        assert.strictEqual(result, "docs-component-og.png");
      });

      it("handles file without leading slash", () => {
        const result = generateOgFilename("docs/README.md", "jpg");
        assert.strictEqual(result, "docs-readme-og.jpg");
      });
    });
  });
});
