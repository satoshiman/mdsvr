import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import http from "node:http";
import { createServer } from "../src/server.js";
import type { ServerInstance } from "../src/index.js";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

function requestRaw(
  baseUrl: string,
  requestPath: string,
): Promise<http.IncomingMessage> {
  const url = new URL(baseUrl);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: requestPath,
        method: "GET",
      },
      resolve,
    );
    req.on("error", reject);
    req.end();
  });
}

describe("router", () => {
  let tempDir: string;
  let server: ServerInstance;
  let baseUrl: string;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-test-"));

    // Create test files
    await fs.writeFile(
      path.join(tempDir, "README.md"),
      "# Hello World\n\nTest content.",
    );
    await fs.writeFile(path.join(tempDir, "test.txt"), "Plain text file");
    await fs.mkdir(path.join(tempDir, "subdir"));
    await fs.writeFile(
      path.join(tempDir, "subdir", "README.md"),
      "# Subdir\n\n[File](./file)",
    );
    await fs.writeFile(
      path.join(tempDir, "subdir", "file.md"),
      "# File\n\nLinked content.",
    );
    await fs.writeFile(
      path.join(tempDir, "subdir", "nested.md"),
      "# Nested\n\nNested content.",
    );

    server = await createServer(tempDir, { port: 0, host: "localhost" });
    baseUrl = server.url;
  });

  after(async () => {
    await server.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("returns 200 for markdown file", async () => {
    const res = await fetch(`${baseUrl}/README.md`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get("content-type")?.includes("text/html"));
    const body = await res.text();
    assert.ok(body.includes("Hello World"));
    assert.ok(body.includes("<h1"));
  });

  it("returns 200 for static text file", async () => {
    const res = await fetch(`${baseUrl}/test.txt`);
    assert.strictEqual(res.status, 200);
    const body = await res.text();
    assert.ok(body.includes("Plain text file"));
  });

  it("returns 200 for directory listing", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    const body = await res.text();
    assert.ok(body.includes("README.md"));
    assert.ok(body.includes("subdir"));
  });

  it("redirects directory URLs to a trailing slash", async () => {
    // When
    const res = await fetch(`${baseUrl}/subdir`, { redirect: "manual" });

    // Then
    assert.strictEqual(res.status, 308);
    assert.strictEqual(res.headers.get("location"), "/subdir/");
  });

  it("preserves query strings in directory redirects", async () => {
    // When
    const res = await fetch(`${baseUrl}/subdir?x=1`, { redirect: "manual" });

    // Then
    assert.strictEqual(res.status, 308);
    assert.strictEqual(res.headers.get("location"), "/subdir/?x=1");
  });

  it("canonicalizes protocol-relative directory paths before redirecting", async () => {
    // Given
    const requestPath = "//subdir";

    // When
    const res = await requestRaw(baseUrl, requestPath);

    // Then
    assert.strictEqual(res.statusCode, 308);
    assert.strictEqual(res.headers.location, "/subdir/");
  });

  it("canonicalizes encoded trailing slashes before redirecting", async () => {
    // Given
    const requestPath = "/subdir%2F?x=1";

    // When
    const res = await requestRaw(baseUrl, requestPath);

    // Then
    assert.strictEqual(res.statusCode, 308);
    assert.strictEqual(res.headers.location, "/subdir/?x=1");
  });

  it("returns 200 for directory URLs with a trailing slash", async () => {
    // When
    const res = await fetch(`${baseUrl}/subdir/`);

    // Then
    assert.strictEqual(res.status, 200);
    const body = await res.text();
    assert.ok(body.includes("Subdir"));
  });

  it("resolves relative links after following a directory redirect", async () => {
    // When
    const res = await fetch(`${baseUrl}/subdir`);

    // Then
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.url, `${baseUrl}/subdir/`);
    const body = await res.text();
    assert.match(body, /href="\.\/file"/);

    const linkedUrl = new URL("./file", res.url);
    assert.strictEqual(linkedUrl.pathname, "/subdir/file");
    const linkedRes = await fetch(linkedUrl);
    assert.strictEqual(linkedRes.status, 200);
    assert.ok((await linkedRes.text()).includes("Linked content."));
  });

  it("returns 404 for missing file", async () => {
    const res = await fetch(`${baseUrl}/missing.md`);
    assert.strictEqual(res.status, 404);
  });

  it("returns 403 for path traversal attempt", async () => {
    // Use raw HTTP request to avoid URL normalization by fetch
    const url = new URL(baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: "/../secret.txt",
      method: "GET",
    };
    const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.request(options, resolve);
      req.on("error", reject);
      req.end();
    });
    assert.strictEqual(res.statusCode, 403);
  });

  it("returns 403 when encoded traversal reaches a sibling sharing the root prefix", async () => {
    // Given
    const outsideDir = `${tempDir}-outside`;
    const secret = "outside-root-prefix-secret";
    await fs.mkdir(outsideDir);
    await fs.writeFile(path.join(outsideDir, "secret.txt"), secret);

    try {
      const requestPath = `/%2e%2e/${encodeURIComponent(path.basename(outsideDir))}/secret.txt`;

      // When
      const res = await requestRaw(baseUrl, requestPath);
      res.setEncoding("utf8");
      let body = "";
      for await (const chunk of res) {
        body += chunk;
      }

      // Then
      assert.strictEqual(
        res.statusCode,
        403,
        `expected encoded traversal to be forbidden, got ${res.statusCode} with body: ${body}`,
      );
      assert.strictEqual(res.headers.location, undefined);
      assert.ok(!body.includes(secret));
    } finally {
      await fs.rm(outsideDir, { recursive: true, force: true });
    }
  });

  it("returns 403 for direct and pretty paths through an outside-root directory symlink", async () => {
    // Given
    const outsideDir = `${tempDir}-symlink-outside`;
    const linkDir = path.join(tempDir, "symlink-outside");
    const secret = "outside-symlink-secret";
    await fs.mkdir(outsideDir);
    await fs.writeFile(path.join(outsideDir, "secret.txt"), secret);
    await fs.writeFile(path.join(outsideDir, "pretty-secret.md"), `# ${secret}`);
    await fs.writeFile(path.join(outsideDir, "pretty-secret-mdx.mdx"), `# ${secret}`);
    await fs.symlink(outsideDir, linkDir, "junction");

    try {
      for (const requestPath of [
        "/symlink-outside/pretty-secret",
        "/symlink-outside/pretty-secret-mdx",
        "/symlink-outside/secret.txt",
      ]) {
        // When
        const res = await requestRaw(baseUrl, requestPath);
        res.setEncoding("utf8");
        let body = "";
        for await (const chunk of res) {
          body += chunk;
        }

        // Then
        assert.strictEqual(
          res.statusCode,
          403,
          `expected ${requestPath} to be forbidden, got ${res.statusCode}; exposed secret: ${body.includes(secret) ? secret : "none"}`,
        );
        assert.strictEqual(res.headers.location, undefined);
        assert.ok(!body.includes(secret));
      }
    } finally {
      await fs.rm(linkDir, { recursive: true, force: true });
      await fs.rm(outsideDir, { recursive: true, force: true });
    }
  });

  it("returns 403 for directory indexes symlinked outside the root", async () => {
    // Given
    const outsideDir = `${tempDir}-index-symlink-outside`;
    const readmeDir = path.join(tempDir, "readme-index-symlink");
    const htmlDir = path.join(tempDir, "html-index-symlink");
    const markdownSentinel = "outside-markdown-index-sentinel";
    const htmlSentinel = "outside-html-index-sentinel";
    const outsideMarkdown = path.join(outsideDir, "outside.md");
    const outsideHtml = path.join(outsideDir, "outside.html");
    await fs.mkdir(outsideDir);
    await fs.mkdir(readmeDir);
    await fs.mkdir(htmlDir);
    await fs.writeFile(outsideMarkdown, `# ${markdownSentinel}`);
    await fs.writeFile(outsideHtml, `<p>${htmlSentinel}</p>`);
    await fs.symlink(outsideMarkdown, path.join(readmeDir, "README.md"), "file");
    await fs.symlink(outsideHtml, path.join(htmlDir, "index.html"), "file");

    try {
      const cases = [
        ["/readme-index-symlink/", markdownSentinel],
        ["/html-index-symlink/", htmlSentinel],
      ] as const;

      // When
      const responses = await Promise.all(
        cases.map(async ([requestPath, sentinel]) => {
          const res = await fetch(`${baseUrl}${requestPath}`);
          const body = await res.text();
          return { requestPath, sentinel, res, body };
        }),
      );

      // Then
      for (const { requestPath, sentinel, res, body } of responses) {
        assert.strictEqual(
          res.status,
          403,
          `expected ${requestPath} to be forbidden, got ${res.status}`,
        );
        assert.ok(!body.includes(sentinel));
      }
    } finally {
      await fs.rm(readmeDir, { recursive: true, force: true });
      await fs.rm(htmlDir, { recursive: true, force: true });
      await fs.rm(outsideDir, { recursive: true, force: true });
    }
  });

  it("returns 405 for POST requests", async () => {
    const res = await fetch(`${baseUrl}/README.md`, { method: "POST" });
    assert.strictEqual(res.status, 405);
  });

  it("handles nested markdown files", async () => {
    const res = await fetch(`${baseUrl}/subdir/nested.md`);
    assert.strictEqual(res.status, 200);
    const body = await res.text();
    assert.ok(body.includes("Nested"));
  });

  it("returns 200 for a file reached through an in-root directory symlink", async () => {
    // Given
    const targetDir = path.join(tempDir, "symlink-target");
    const linkDir = path.join(tempDir, "symlink-inside");
    const content = "In-root symlink content";
    await fs.mkdir(targetDir);
    await fs.writeFile(path.join(targetDir, "linked.txt"), content);
    await fs.symlink(targetDir, linkDir, "junction");

    try {
      // When
      const res = await fetch(`${baseUrl}/symlink-inside/linked.txt`);

      // Then
      assert.strictEqual(res.status, 200);
      assert.strictEqual(await res.text(), content);
    } finally {
      await fs.rm(linkDir, { recursive: true, force: true });
      await fs.rm(targetDir, { recursive: true, force: true });
    }
  });
});
