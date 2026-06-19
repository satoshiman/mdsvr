import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { createServer } from "../src/server.js";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

describe("server", () => {
  let tempDir: string;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-server-test-"));
    await fs.writeFile(path.join(tempDir, "index.md"), "# Index\n");
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("creates server with default options", async () => {
    const server = await createServer(tempDir, { port: 0 });
    assert.ok(server.port > 0);
    assert.ok(server.url.startsWith("http://"));
    await server.close();
  });

  it("creates server with custom port", async () => {
    const server = await createServer(tempDir, { port: 0, host: "127.0.0.1" });
    assert.ok(server.url.includes("127.0.0.1"));
    await server.close();
  });

  it("throws for non-existent directory", async () => {
    await assert.rejects(
      createServer("/does/not/exist"),
      /Directory does not exist/,
    );
  });

  it("closes gracefully", async () => {
    const server = await createServer(tempDir, { port: 0 });
    await assert.doesNotReject(server.close());
  });
});
