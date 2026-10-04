import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { exportStaticSite } from "../src/generators/static-export.js";
import { loadSettings } from "../src/settings/index.js";
import {
  loadExportState,
  cleanupOrphanedFiles,
  type ExportState,
} from "../src/export-state.js";

describe("static export", () => {
  let tempDir: string;
  let outputDir: string;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-export-test-"));
    outputDir = path.join(tempDir, "output");

    const rootDir = path.join(tempDir, "docs");
    await fs.mkdir(path.join(rootDir, "no-readme-dir"), { recursive: true });
    await fs.mkdir(path.join(rootDir, "assets"), { recursive: true });
    await fs.mkdir(path.join(rootDir, ".github", "workflows"), {
      recursive: true,
    });
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
    await fs.writeFile(path.join(rootDir, "package.json"), "{}");
    await fs.writeFile(path.join(rootDir, "notes.mdx"), "# Notes");
    await fs.writeFile(
      path.join(rootDir, "assets", "app.js"),
      "console.log('ok');",
    );
    await fs.writeFile(
      path.join(rootDir, ".github", "workflows", "deploy.yml"),
      "name: Deploy",
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
        '<meta property="og:image" content="/public/assets/og/index.jpg">',
      ),
      "root index should include generated OG image meta tag",
    );
    assert.ok(rootIndex.includes('class="view-toggle"'));
    assert.ok(rootIndex.includes("function toggleContentView()"));
    assert.ok(rootIndex.includes('data-content-view="wide"'));

    const autoIndex = await fs.readFile(
      path.join(outputDir, "no-readme-dir", "index.html"),
      "utf-8",
    );
    assert.ok(
      autoIndex.includes(
        '<meta property="og:image" content="/public/assets/og/no-readme-dir/index.jpg">',
      ),
      "auto-generated directory index should include generated OG image meta tag",
    );

    await fs.access(
      path.join(
        outputDir,
        "public",
        "assets",
        "og",
        "no-readme-dir",
        "index.jpg",
      ),
    );

    const vietnameseOg = await fs.stat(
      path.join(outputDir, "public", "assets", "og", "vietnamese", "index.jpg"),
    );
    assert.ok(
      vietnameseOg.size > 0,
      "Vietnamese page OG image should be generated and non-empty",
    );
  });

  it("generates sitemap.xml with absolute URLs when baseUrl is set", async () => {
    const rootDir = path.join(tempDir, "docs");
    const settings = await loadSettings(rootDir);
    const withBase = structuredClone(settings);
    withBase.site.baseUrl = "https://docs.example.com";
    await exportStaticSite({
      rootDir,
      outputDir,
      settings: withBase,
      silent: true,
    });

    const sitemapPath = path.join(outputDir, "sitemap.xml");
    const sitemap = await fs.readFile(sitemapPath, "utf-8");

    assert.ok(sitemap.includes('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(sitemap.includes("<urlset"));
    assert.ok(
      sitemap.includes("<loc>https://docs.example.com/</loc>"),
      "sitemap should contain absolute homepage URL",
    );
    assert.ok(
      sitemap.includes("<loc>https://docs.example.com/vietnamese/</loc>"),
      "sitemap doc URLs should use the canonical trailing-slash form",
    );
    assert.ok(
      sitemap.includes("<loc>https://docs.example.com/no-readme-dir/</loc>"),
      "sitemap should include auto-index directory pages",
    );
    assert.ok(
      !sitemap.includes("/README</loc>"),
      "README files should map to directory URLs, not /README",
    );
    assert.ok(
      !sitemap.includes("localhost"),
      "sitemap must never emit localhost URLs",
    );
  });

  it("skips sitemap.xml on export when baseUrl is not configured", async () => {
    const rootDir = path.join(tempDir, "docs");
    const settings = await loadSettings(rootDir);
    const noBaseOutput = path.join(tempDir, "output-nobase");
    await exportStaticSite({
      rootDir,
      outputDir: noBaseOutput,
      settings,
      silent: true,
    });

    await assert.rejects(
      fs.access(path.join(noBaseOutput, "sitemap.xml")),
      (err: NodeJS.ErrnoException) => err.code === "ENOENT",
      "sitemap.xml must not be written without an absolute base URL",
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
        '<meta property="og:image" content="/public/assets/og/index.jpg">',
      ),
      "generated OG image should take precedence over defaultImage",
    );
    assert.ok(
      !rootIndex.includes("https://example.com/default.jpg"),
      "defaultImage should not appear when generated OG is available",
    );
  });

  it("generates robots.txt and exports only served web files", async () => {
    const rootDir = path.join(tempDir, "docs");
    const settings = await loadSettings(rootDir);
    await exportStaticSite({
      rootDir,
      outputDir,
      settings,
      silent: true,
    });

    const robots = await fs.readFile(
      path.join(outputDir, "robots.txt"),
      "utf-8",
    );
    assert.ok(robots.includes("User-agent: *"));
    assert.ok(robots.includes("Allow: /"));
    assert.ok(
      !robots.includes("Sitemap:"),
      "robots.txt must not emit a relative Sitemap line without baseUrl",
    );

    await fs.access(path.join(outputDir, "notes", "index.html"));
    await fs.access(path.join(outputDir, "assets", "app.js"));

    await assert.rejects(
      fs.access(path.join(outputDir, "package.json")),
      (err: NodeJS.ErrnoException) => err.code === "ENOENT",
    );
    await assert.rejects(
      fs.access(path.join(outputDir, ".github")),
      (err: NodeJS.ErrnoException) => err.code === "ENOENT",
    );
    await assert.rejects(
      fs.access(path.join(outputDir, "settings.json")),
      (err: NodeJS.ErrnoException) => err.code === "ENOENT",
    );
  });

  it("honors a custom robots.txt and can disable generation", async () => {
    const rootDir = path.join(tempDir, "docs");
    const settings = await loadSettings(rootDir);
    const customRobots = "User-agent: *\nDisallow: /drafts\n";
    await fs.writeFile(path.join(rootDir, "robots.txt"), customRobots);

    await exportStaticSite({
      rootDir,
      outputDir,
      settings,
      silent: true,
    });
    assert.strictEqual(
      await fs.readFile(path.join(outputDir, "robots.txt"), "utf-8"),
      customRobots,
    );

    const disabledSettings = structuredClone(settings);
    disabledSettings.seo.generateRobotsTxt = false;
    await exportStaticSite({
      rootDir,
      outputDir,
      settings: disabledSettings,
      silent: true,
    });
    await assert.rejects(
      fs.access(path.join(outputDir, "robots.txt")),
      (err: NodeJS.ErrnoException) => err.code === "ENOENT",
    );

    await fs.unlink(path.join(rootDir, "robots.txt"));
  });

  it("cleans up orphaned HTML files when source is deleted", async () => {
    const rootDir = path.join(tempDir, "docs");
    const settings = await loadSettings(rootDir);

    // Recreate the file if it was deleted in previous test
    try {
      await fs.access(path.join(rootDir, "vietnamese.md"));
    } catch {
      await fs.writeFile(
        path.join(rootDir, "vietnamese.md"),
        "# Tiếng Việt\n\nKý tự tiếng Việt.",
      );
    }

    // First export
    await exportStaticSite({
      rootDir,
      outputDir,
      settings,
      silent: true,
    });

    // Verify file exists
    await fs.access(path.join(outputDir, "vietnamese", "index.html"));

    // Delete source file
    await fs.unlink(path.join(rootDir, "vietnamese.md"));

    // Second export should clean up orphaned file
    await exportStaticSite({
      rootDir,
      outputDir,
      settings,
      silent: true,
    });

    // Verify orphaned file was deleted
    try {
      await fs.access(path.join(outputDir, "vietnamese", "index.html"));
      assert.fail("Orphaned HTML file should be deleted");
    } catch (err) {
      assert.ok((err as NodeJS.ErrnoException).code === "ENOENT");
    }

    // Verify empty directory was cleaned up
    try {
      await fs.access(path.join(outputDir, "vietnamese"));
      assert.fail("Empty directory should be deleted");
    } catch (err) {
      assert.ok((err as NodeJS.ErrnoException).code === "ENOENT");
    }
  });

  it("cleans up orphaned OG files when source is deleted", async () => {
    const rootDir = path.join(tempDir, "docs");
    const settings = await loadSettings(rootDir);

    // Recreate the file if it was deleted in previous test
    try {
      await fs.access(path.join(rootDir, "vietnamese.md"));
    } catch {
      await fs.writeFile(
        path.join(rootDir, "vietnamese.md"),
        "# Tiếng Việt\n\nKý tự tiếng Việt.",
      );
    }

    // First export
    await exportStaticSite({
      rootDir,
      outputDir,
      settings,
      silent: true,
    });

    // Check OG directory exists and has files
    const ogDir = path.join(outputDir, "public", "assets", "og");
    const ogFiles = await fs.readdir(ogDir);
    assert.ok(ogFiles.length > 0, "OG directory should have files");

    // Delete source file
    await fs.unlink(path.join(rootDir, "vietnamese.md"));

    // Second export should clean up orphaned OG file
    await exportStaticSite({
      rootDir,
      outputDir,
      settings,
      silent: true,
    });

    // Verify OG file for deleted source was cleaned up
    const newOgFiles = await fs.readdir(ogDir);
    assert.ok(
      newOgFiles.length < ogFiles.length,
      "OG file count should decrease after source deletion",
    );
  });

  it("preserves unchanged files", async () => {
    const rootDir = path.join(tempDir, "docs");
    const settings = await loadSettings(rootDir);

    // First export
    await exportStaticSite({
      rootDir,
      outputDir,
      settings,
      silent: true,
    });

    const firstContent = await fs.readFile(
      path.join(outputDir, "index.html"),
      "utf-8",
    );

    // Second export without changes
    await exportStaticSite({
      rootDir,
      outputDir,
      settings,
      silent: true,
    });

    const secondContent = await fs.readFile(
      path.join(outputDir, "index.html"),
      "utf-8",
    );

    assert.strictEqual(
      firstContent,
      secondContent,
      "Unchanged files should be preserved",
    );
  });

  it("migrates old state format", async () => {
    const rootDir = path.join(tempDir, "docs");
    const settings = await loadSettings(rootDir);

    // Create old state file
    const oldOgDir = path.join(outputDir, "public", "assets", "og");
    await fs.mkdir(oldOgDir, { recursive: true });
    const oldState = {
      "/README.md": "abc123",
      "/vietnamese.md": "def456",
    };
    await fs.writeFile(
      path.join(oldOgDir, ".mdsvr-og-state.json"),
      JSON.stringify(oldState),
      "utf-8",
    );

    // Export should migrate old state
    await exportStaticSite({
      rootDir,
      outputDir,
      settings,
      silent: true,
    });

    // Old state file should be deleted
    try {
      await fs.access(path.join(oldOgDir, ".mdsvr-og-state.json"));
      assert.fail("Old state file should be deleted after migration");
    } catch (err) {
      assert.ok((err as NodeJS.ErrnoException).code === "ENOENT");
    }

    // New state file should exist in root directory
    const newState = await loadExportState(rootDir);
    assert.ok(newState, "New state should be loaded");
    // Migration only converts OG state, HTML entries are created by export process
    assert.ok(
      Object.keys(newState.og).length > 0,
      "New state should have OG entries from migration",
    );
  });
});
