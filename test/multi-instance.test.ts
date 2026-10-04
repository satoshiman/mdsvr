import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { createServer } from "../src/server.js";
import type { ServerInstance } from "../src/types.js";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

async function makeRoot(title: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-multi-"));
  await fs.mkdir(path.join(dir, "_mdsvr"), { recursive: true });
  await fs.writeFile(
    path.join(dir, "_mdsvr/settings.json"),
    JSON.stringify({ site: { title } }),
  );
  await fs.writeFile(path.join(dir, "index.md"), "# Hello\n");
  return dir;
}

describe("multi-instance isolation", () => {
  const dirs: string[] = [];
  const servers: ServerInstance[] = [];

  before(async () => {
    dirs.push(await makeRoot("Site A"), await makeRoot("Site B"));
    servers.push(
      await createServer(dirs[0], { port: 0, silent: true }),
      await createServer(dirs[1], { port: 0, silent: true }),
    );
  });

  after(async () => {
    for (const server of servers) await server.close();
    for (const dir of dirs) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("starts two servers on different ports", () => {
    assert.ok(servers[0].port !== servers[1].port);
  });

  it("each instance serves its own settings", async () => {
    const resA = await fetch(servers[0].url);
    const resB = await fetch(servers[1].url);
    const htmlA = await resA.text();
    const htmlB = await resB.text();
    assert.ok(htmlA.includes("Site A"));
    assert.ok(htmlB.includes("Site B"));
  });

  it("reloading settings on one instance does not affect the other", async () => {
    // Change settings only for instance A
    await fs.writeFile(
      path.join(dirs[0], "_mdsvr/settings.json"),
      JSON.stringify({ site: { title: "Site A Reloaded" } }),
    );
    await servers[0].reloadSettings();

    const htmlA = await (await fetch(servers[0].url)).text();
    const htmlB = await (await fetch(servers[1].url)).text();
    assert.ok(htmlA.includes("Site A Reloaded"));
    assert.ok(htmlB.includes("Site B"));
    assert.ok(!htmlB.includes("Site A Reloaded"));
  });
});
