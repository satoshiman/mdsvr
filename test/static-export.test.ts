import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { exportStaticSite } from "../src/generators/static-export.js";
import { loadSettings } from "../src/settings/index.js";

describe("static export", () => {
  let tempDir: string;
  let outputDir: string;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-export-test-"));
    outputDir = path.join(tempDir, "output");

    const rootDir = path.join(tempDir, "docs");
    await fs.mkdir(path.join(rootDir, "no-readme-dir"), { recursive: true });
    await fs.writeFile(
      path.join(rootDir, "README.md"),
      "# Root Page\n\nRoot content.",
    );
    await fs.writeFile(
      path.join(rootDir, "vietnamese.md"),
      "# Tiếng Việt\n\nKý tự tiếng Việt.",
    );
    await fs.writeFile(
      path.join(rootDir, "no-readme-dir", "page.md"),
      "# Page\n\nPage content.",
    );
    await fs.writeFile(
      path.join(rootDir, "settings.json"),
      JSON.stringify(
        {
          site: { title: "Export Test", description: "Test" },
          seo: {
            og: { enabled: true, imageFormat: "jpg" },
          },
        },
        null,
        2,
      ),
    );
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("generates OG images for markdown pages and auto-index directories", async () => {
    const rootDir = path.join(tempDir, "docs");
    const settings = await loadSettings(rootDir);
    await exportStaticSite({
      rootDir,
      outputDir,
      settings,
      silent: true,
    });

    const rootIndex = await fs.readFile(
      path.join(outputDir, "index.html"),
      "utf-8",
    );
    assert.ok(
      rootIndex.includes(
        '<meta property="og:image" content="/public/og/index.jpg">',
      ),
      "root index should include generated OG image meta tag",
    );

    const autoIndex = await fs.readFile(
      path.join(outputDir, "no-readme-dir", "index.html"),
      "utf-8",
    );
    assert.ok(
      autoIndex.includes(
        '<meta property="og:image" content="/public/og/no-readme-dir/index.jpg">',
      ),
      "auto-generated directory index should include generated OG image meta tag",
    );

    await fs.access(
      path.join(outputDir, "public", "og", "no-readme-dir", "index.jpg"),
    );

    const vietnameseOg = await fs.stat(
      path.join(outputDir, "public", "og", "vietnamese", "index.jpg"),
    );
    assert.ok(
      vietnameseOg.size > 0,
      "Vietnamese page OG image should be generated and non-empty",
    );
  });

  it("prefers generated OG image over defaultImage", async () => {
    const rootDir = path.join(tempDir, "docs");
    const settings = await loadSettings(rootDir);
    const customSettings = {
      ...settings,
      seo: {
        ...settings.seo,
        defaultImage: "https://example.com/default.jpg",
      },
    };
    await exportStaticSite({
      rootDir,
      outputDir: path.join(tempDir, "output2"),
      settings: customSettings,
      silent: true,
    });

    const rootIndex = await fs.readFile(
      path.join(tempDir, "output2", "index.html"),
      "utf-8",
    );
    assert.ok(
      rootIndex.includes(
        '<meta property="og:image" content="/public/og/index.jpg">',
      ),
      "generated OG image should take precedence over defaultImage",
    );
    assert.ok(
      !rootIndex.includes("https://example.com/default.jpg"),
      "defaultImage should not appear when generated OG is available",
    );
  });
});
