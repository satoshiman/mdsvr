import { describe, it } from "node:test";
import assert from "node:assert";
import { getOgImagePath, getOgImageUrl } from "../src/og/generator.js";

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
    it("returns /public/og/index.jpg for root", () => {
      const result = getOgImageUrl("/", "", "jpg");
      assert.strictEqual(result, "/public/og/index.jpg");
    });

    it("returns basePath public/og/index.jpg for root with basePath", () => {
      const result = getOgImageUrl("/docs/", "/docs", "jpg");
      assert.strictEqual(result, "/docs/public/og/index.jpg");
    });

    it("returns nested public og url for subdirectory", () => {
      const result = getOgImageUrl("/docs/3.-features", "/docs", "jpg");
      assert.strictEqual(
        result,
        "/docs/public/og/3.-features/index.jpg",
      );
    });
  });
});
