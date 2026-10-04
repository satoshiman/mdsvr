import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  generateLlmsTxt,
  generateLlmsFullTxt,
} from "../src/generators/llms.js";
import { exportStaticSite } from "../src/generators/static-export.js";
import { SettingsSchema, type Settings } from "../src/settings/index.js";

function makeSettings(overrides: Record<string, unknown> = {}): Settings {
  return SettingsSchema.parse(overrides);
}

describe("llms.txt", () => {
  let tempDir: string;
  let rootDir: string;
  let outputDir: string;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-llms-"));
    rootDir = path.join(tempDir, "docs");
    outputDir = path.join(tempDir, "out");
    await fs.mkdir(path.join(rootDir, "guide"), { recursive: true });
    await fs.writeFile(
      path.join(rootDir, "README.md"),
      "---\ndescription: Home page desc\n---\n\n# Home\n\nWelcome to the docs.",
    );
    await fs.writeFile(
      path.join(rootDir, "guide", "setup.md"),
      "---\ntitle: Setup Guide\ndescription: How to set things up\n---\n\n# Setup\n\nStep one.",
    );
    await fs.writeFile(
      path.join(rootDir, "guide", "usage.md"),
      "# Usage\n\nUse it like this.",
    );
    await fs.writeFile(
      path.join(rootDir, "draft.md"),
      "---\nnoindex: true\n---\n\n# Draft\n\nSecret.",
    );
    await fs.writeFile(path.join(rootDir, "_hidden.md"), "# Hidden\n");
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("builds an index grouped by section with absolute links", async () => {
    const settings = makeSettings({
      site: {
        title: "Acme Docs",
        description: "Acme documentation",
        baseUrl: "https://docs.example.com",
      },
    });
    const llms = await generateLlmsTxt(rootDir, settings);

    assert.ok(llms.startsWith("# Acme Docs\n"));
    assert.ok(llms.includes("> Acme documentation"));
    assert.ok(llms.includes("## Docs"));
    assert.ok(llms.includes("## Guide"));
    assert.ok(
      llms.includes("- [Home](https://docs.example.com/): Home page desc"),
    );
    assert.ok(
      llms.includes(
        "- [Setup Guide](https://docs.example.com/guide/setup/): How to set things up",
      ),
    );
    assert.ok(
      llms.includes("- [Usage](https://docs.example.com/guide/usage/)"),
    );
  });

  it("excludes noindex and hidden pages", async () => {
    const llms = await generateLlmsTxt(rootDir, makeSettings());
    assert.ok(!llms.includes("Draft"));
    assert.ok(!llms.includes("draft"));
    assert.ok(!llms.includes("Hidden"));
  });

  it("falls back to root-relative links without baseUrl", async () => {
    const llms = await generateLlmsTxt(rootDir, makeSettings());
    assert.ok(llms.includes("](/guide/setup/)"));
  });

  it("prefers a custom llms.txt in the docs root", async () => {
    const custom = "# Custom\n\n- [Only](https://x.example/)\n";
    await fs.writeFile(path.join(rootDir, "llms.txt"), custom);
    try {
      const llms = await generateLlmsTxt(
        rootDir,
        makeSettings({ site: { title: "Acme" } }),
      );
      assert.strictEqual(llms, custom);
    } finally {
      await fs.unlink(path.join(rootDir, "llms.txt"));
    }
  });

  it("llms-full concatenates full markdown source with attribution", async () => {
    const settings = makeSettings({
      site: { title: "Acme Docs", baseUrl: "https://docs.example.com" },
    });
    const full = await generateLlmsFullTxt(rootDir, settings);

    assert.ok(full.startsWith("# Acme Docs\n"));
    assert.ok(full.includes("# Setup Guide"));
    assert.ok(full.includes("Source: https://docs.example.com/guide/setup/"));
    assert.ok(full.includes("Step one."));
    assert.ok(full.includes("Welcome to the docs."));
    // Frontmatter must be stripped from embedded sources
    assert.ok(!full.includes("noindex: true"), "draft page excluded");
    assert.ok(
      !full.includes("description: How to set things up\n"),
      "frontmatter stripped",
    );
  });

  it("static export writes both files at the output root", async () => {
    const settings = makeSettings({
      site: { title: "Acme Docs", baseUrl: "https://docs.example.com" },
      seo: { og: { enabled: false } },
    });
    await exportStaticSite({
      rootDir,
      outputDir,
      settings,
      silent: true,
    });

    const llms = await fs.readFile(path.join(outputDir, "llms.txt"), "utf-8");
    const full = await fs.readFile(
      path.join(outputDir, "llms-full.txt"),
      "utf-8",
    );
    assert.ok(llms.includes("# Acme Docs"));
    assert.ok(full.includes("Step one."));
  });

  it("does not write the files when generateLlmsTxt is disabled", async () => {
    const settings = makeSettings({
      seo: { og: { enabled: false }, generateLlmsTxt: false },
    });
    const out = path.join(tempDir, "out-disabled");
    await exportStaticSite({ rootDir, outputDir: out, settings, silent: true });
    await assert.rejects(fs.stat(path.join(out, "llms.txt")));
    await assert.rejects(fs.stat(path.join(out, "llms-full.txt")));
  });
});
