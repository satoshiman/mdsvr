import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createServer } from "../src/server.js";
import type { ServerInstance } from "../src/types.js";
import { renderPageService } from "../src/render-page.js";
import { SettingsSchema } from "../src/settings/index.js";

function extractBody(html: string): string {
  const match = html.match(
    /<article class="markdown-body">([\s\S]*?)<\/article>/,
  );
  assert.ok(match, "markdown body not found");
  return match[1];
}

describe("GitHub-compatible source format (cleanUrls)", () => {
  let rootDir: string;
  let cleanServer: ServerInstance;
  let plainServer: ServerInstance;

  before(async () => {
    rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-cleanurls-"));
    await fs.writeFile(
      path.join(rootDir, "README.md"),
      "# Home\n\nSee [guide](./guide.md#setup).\n",
    );
    await fs.writeFile(path.join(rootDir, "guide.md"), "# Guide\n\nContent.\n");
    await fs.mkdir(path.join(rootDir, "_mdsvr"));
    await fs.writeFile(
      path.join(rootDir, "_mdsvr/settings.json"),
      JSON.stringify({ generate: { cleanUrls: true } }),
    );

    cleanServer = await createServer(rootDir, { port: 0, silent: true });
    plainServer = await createServer(rootDir, {
      port: 0,
      silent: true,
      watchSettings: false,
    });
    // plainServer shares rootDir settings; give it a separate root instead
    await plainServer.close();
    const plainRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "mdsvr-plainurls-"),
    );
    await fs.writeFile(
      path.join(plainRoot, "guide.md"),
      "# Guide\n\nContent.\n",
    );
    plainServer = await createServer(plainRoot, { port: 0, silent: true });
    plainRootDir = plainRoot;
  });

  let plainRootDir = "";

  after(async () => {
    await cleanServer.close();
    await plainServer.close();
    await fs.rm(rootDir, { recursive: true, force: true });
    if (plainRootDir) {
      await fs.rm(plainRootDir, { recursive: true, force: true });
    }
  });

  it("redirects .md URLs to clean URLs with 308 when cleanUrls is on", async () => {
    const res = await fetch(`${cleanServer.url}/guide.md`, {
      redirect: "manual",
    });
    assert.strictEqual(res.status, 308);
    assert.strictEqual(res.headers.get("location"), "/guide");
  });

  it("preserves query strings in the clean-URL redirect", async () => {
    const res = await fetch(`${cleanServer.url}/guide.md?x=1`, {
      redirect: "manual",
    });
    assert.strictEqual(res.headers.get("location"), "/guide?x=1");
  });

  it("redirects README.md to the directory URL", async () => {
    const res = await fetch(`${cleanServer.url}/README.md`, {
      redirect: "manual",
    });
    assert.strictEqual(res.status, 308);
    assert.strictEqual(res.headers.get("location"), "/");
  });

  it("rewrites .md links in served HTML when cleanUrls is on", async () => {
    const res = await fetch(`${cleanServer.url}/guide`);
    const body = await res.text();
    const index = await (await fetch(`${cleanServer.url}/`)).text();
    assert.ok(res.ok);
    // Relative .md links are rebased to canonical site-relative routes
    assert.ok(index.includes('href="/guide/#setup"'));
    assert.ok(!extractBody(index).includes("guide.md"));
    assert.ok(body.includes("Guide"));
  });

  it("serves .md URLs directly when cleanUrls is off", async () => {
    const res = await fetch(`${plainServer.url}/guide.md`);
    assert.strictEqual(res.status, 200);
  });

  it("dynamic cleanUrls body matches static export body", async () => {
    const settings = SettingsSchema.parse({ generate: { cleanUrls: true } });
    const input = {
      sourcePath: path.join(rootDir, "README.md"),
      urlPath: "/",
      rootDir,
      settings,
    };
    const dynamic = await renderPageService({ ...input, mode: "dynamic" });
    const statik = await renderPageService({ ...input, mode: "static" });
    assert.strictEqual(extractBody(dynamic.html), extractBody(statik.html));
  });
});
