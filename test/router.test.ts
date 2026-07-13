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
});
