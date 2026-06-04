import http from "node:http";
import path from "node:path";
import { promises as fs } from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import type { ServeOptions, ServerInstance } from "./types.js";
import { route } from "./router.js";
import {
  loadSettings,
  watchSettings,
  type Settings,
} from "./settings/index.js";
import { buildSearchIndex } from "./generators/search-index.js";

// Global state for the server
let currentSettings: Settings;
let searchIndexCache: unknown = null;

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

  // Load settings
  currentSettings = await loadSettings(absoluteRoot);

  // Build search index
  if (currentSettings.search.enabled) {
    searchIndexCache = await buildSearchIndex(absoluteRoot, currentSettings);
  }

  const port = options.port ?? 1900;
  const host = options.host ?? "localhost";
  const watchSettingsEnabled = options.watchSettings ?? true;
  const maxRetries = 10;

  return new Promise((resolve, reject) => {
    let currentPort = port;
    let retryCount = 0;

    const tryListen = () => {
      const server = http.createServer((req, res) => {
        route(req, res, absoluteRoot, currentSettings, searchIndexCache).catch(
          (err) => {
            console.error("Routing error:", err);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal Server Error");
          },
        );
      });

      server.listen(currentPort, host, () => {
        const actualPort = (server.address() as { port: number }).port;
        const url = `http://${host}:${actualPort}`;

        // Watch settings file for changes
        if (watchSettingsEnabled) {
          (async () => {
            try {
              const settingsPath = path.join(absoluteRoot, "settings.json");
              await fs.access(settingsPath);
              watchSettings(absoluteRoot, async (newSettings) => {
                currentSettings = newSettings;
                if (currentSettings.search.enabled) {
                  searchIndexCache = await buildSearchIndex(
                    absoluteRoot,
                    currentSettings,
                  );
                }
                if (!options.silent) {
                  console.log("[mdsvr] Settings reloaded");
                }
              });
            } catch {
              // No settings.json to watch, that's fine
            }
          })();
        }

        const instance: ServerInstance = {
          port: actualPort,
          host,
          url,
          settings: currentSettings,
          close: () =>
            new Promise((res, rej) => {
              server.close((err) => {
                if (err) rej(err);
                else res();
              });
            }),
          reloadSettings: async () => {
            currentSettings = await loadSettings(absoluteRoot);
            if (currentSettings.search.enabled) {
              searchIndexCache = await buildSearchIndex(
                absoluteRoot,
                currentSettings,
              );
            }
          },
        };

        resolve(instance);
      });

      server.on("error", (err) => {
        if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
          retryCount++;
          if (retryCount <= maxRetries) {
            currentPort++;
            server.close();
            tryListen();
          } else {
            reject(
              new Error(
                `Port ${port} and next ${maxRetries} ports are all in use`,
              ),
            );
          }
        } else {
          reject(err);
        }
      });
    };

    tryListen();
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

// Export for use by router
export { currentSettings, searchIndexCache };
