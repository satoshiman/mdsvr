import http from "node:http";
import path from "node:path";
import { promises as fs } from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { ServeOptions, ServerInstance } from "./types.js";
import { route } from "./router.js";

export async function createServer(
  rootDir: string,
  options: ServeOptions = {},
): Promise<ServerInstance> {
  // Resolve rootDir to absolute path
  const absoluteRoot = path.resolve(rootDir);

  // Check if directory exists
  try {
    const stat = await fs.stat(absoluteRoot);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${absoluteRoot}`);
    }
  } catch (err) {
    throw new Error(`Directory does not exist: ${absoluteRoot}`);
  }

  const port = options.port ?? 3000;
  const host = options.host ?? "localhost";

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      route(req, res, absoluteRoot).catch((err) => {
        console.error("Routing error:", err);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      });
    });

    server.listen(port, host, () => {
      const url = `http://${host}:${port}`;

      const instance: ServerInstance = {
        port,
        host,
        url,
        close: () =>
          new Promise((res, rej) => {
            server.close((err) => {
              if (err) rej(err);
              else res();
            });
          }),
      };

      resolve(instance);
    });

    server.on("error", (err) => {
      reject(err);
    });
  });
}

export function getNetworkAddress(): string | undefined {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const info of iface) {
      if (info.family === "IPv4" && !info.internal) {
        return info.address;
      }
    }
  }
  return undefined;
}
