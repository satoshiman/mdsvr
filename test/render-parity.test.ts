import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { renderPageService, renderDirectoryPage } from "../src/render-page.js";
import { SettingsSchema } from "../src/settings/index.js";

function extractBody(html: string): string {
  const match = html.match(
    /<article class="markdown-body">([\s\S]*?)<\/article>/,
  );
  assert.ok(match, "markdown body not found in rendered page");
  return match[1];
}

describe("render parity (dynamic vs static)", () => {
  let rootDir: string;
  const settings = SettingsSchema.parse({});

  before(async () => {
    rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-parity-"));
    await fs.writeFile(
      path.join(rootDir, "index.md"),
      "# Home\n\nWelcome [guide](./guide.md#setup).\n",
    );
    await fs.writeFile(
      path.join(rootDir, "guide.md"),
      "# Guide\n\nSome **bold** content.\n",
    );
    await fs.mkdir(path.join(rootDir, "section"));
    await fs.writeFile(
      path.join(rootDir, "section", "page.mdx"),
      "# MDX Page\n\nParagraph.\n",
    );
    await fs.writeFile(
      path.join(rootDir, "section", "lesson.md"),
      "# Lesson\n\n![Cat](../assets/cat.png)\n",
    );
    await fs.mkdir(path.join(rootDir, "assets"));
    await fs.writeFile(path.join(rootDir, "assets", "cat.png"), "png");
  });

  after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  it("renders identical markdown body for a plain markdown page", async () => {
    const input = {
      sourcePath: path.join(rootDir, "guide.md"),
      urlPath: "/guide",
      rootDir,
      settings,
    };
    const dynamic = await renderPageService({ ...input, mode: "dynamic" });
    const statik = await renderPageService({ ...input, mode: "static" });
    assert.strictEqual(dynamic.title, statik.title);
    assert.strictEqual(extractBody(dynamic.html), extractBody(statik.html));
  });

  it("renders identical markdown body for an MDX page", async () => {
    const input = {
      sourcePath: path.join(rootDir, "section", "page.mdx"),
      urlPath: "/section/page",
      rootDir,
      settings,
    };
    const dynamic = await renderPageService({ ...input, mode: "dynamic" });
    const statik = await renderPageService({ ...input, mode: "static" });
    assert.strictEqual(extractBody(dynamic.html), extractBody(statik.html));
  });

  it("converts .md links to canonical routes in both modes", async () => {
    const input = {
      sourcePath: path.join(rootDir, "index.md"),
      urlPath: "/",
      rootDir,
      settings,
    };
    const dynamic = await renderPageService({ ...input, mode: "dynamic" });
    const statik = await renderPageService({ ...input, mode: "static" });
    const dynamicBody = extractBody(dynamic.html);
    const staticBody = extractBody(statik.html);
    // Both modes rebase relative links to canonical site-relative routes:
    // canonical page URLs are trailing-slash directories, so raw relative
    // links would resolve one level too deep in the browser (issue #53).
    for (const body of [dynamicBody, staticBody]) {
      assert.ok(!body.includes("guide.md"));
      assert.ok(body.includes("/guide/"));
      assert.ok(body.includes("#setup"));
    }
    assert.strictEqual(dynamicBody, staticBody);
  });

  it("rebases relative asset paths against the source file in both modes", async () => {
    const input = {
      sourcePath: path.join(rootDir, "section", "lesson.md"),
      urlPath: "/section/lesson/",
      rootDir,
      settings,
    };
    const dynamic = await renderPageService({ ...input, mode: "dynamic" });
    const statik = await renderPageService({ ...input, mode: "static" });
    // `../assets/cat.png` resolves against the source file's directory, not
    // the trailing-slash page URL (which would 404 as /section/assets/...).
    for (const page of [dynamic, statik]) {
      assert.ok(extractBody(page.html).includes('src="/assets/cat.png"'));
    }
  });

  it("renders an inline error callout instead of throwing for broken MDX", async () => {
    await fs.writeFile(
      path.join(rootDir, "broken.mdx"),
      "# Broken\n\n<Unregistered>x</Unregistered>\n",
    );
    const page = await renderPageService({
      sourcePath: path.join(rootDir, "broken.mdx"),
      urlPath: "/broken/",
      rootDir,
      settings,
      mode: "dynamic",
    });
    assert.ok(page.html.includes("MDX render error"));
    assert.strictEqual(page.title, "Broken");
  });

  it("lists the same entries for a directory index", async () => {
    const dynamic = await renderDirectoryPage({
      listDir: rootDir,
      urlPath: "/",
      rootDir,
      settings,
      mode: "dynamic",
    });
    const statik = await renderDirectoryPage({
      listDir: rootDir,
      urlPath: "/",
      rootDir,
      settings,
      mode: "static",
    });
    const dynamicBody = extractBody(dynamic.html);
    const staticBody = extractBody(statik.html);
    for (const name of ["guide.md", "section"]) {
      assert.ok(dynamicBody.includes(name));
      assert.ok(staticBody.includes(name));
    }
    // Index files render as the directory page itself — hidden in listings
    assert.ok(!dynamicBody.includes("index.md"));
    assert.ok(!staticBody.includes("index.md"));
  });
});
