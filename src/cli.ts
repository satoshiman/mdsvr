#!/usr/bin/env node

import { createServer, getNetworkAddress } from "./server.js";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  validateSettingsFile,
  generateDefaultSettings,
} from "./settings/index.js";

interface ParsedArgs {
  dir: string;
  dirSpecified: boolean;
  port: number;
  host: string;
  open: boolean;
  silent: boolean;
  version: boolean;
  help: boolean;
  init: boolean;
  validate: boolean;
  watchSettings: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    dir: ".",
    dirSpecified: false,
    port: 1800,
    host: "localhost",
    open: false,
    silent: false,
    version: false,
    help: false,
    init: false,
    validate: false,
    watchSettings: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--version" || arg === "-v") {
      args.version = true;
    } else if (arg === "--port" || arg === "-p") {
      const val = argv[++i];
      if (val) args.port = parseInt(val, 10);
    } else if (arg === "--host") {
      const val = argv[++i];
      if (val) args.host = val;
    } else if (arg === "--open" || arg === "-o") {
      args.open = true;
    } else if (arg === "--silent" || arg === "-s") {
      args.silent = true;
    } else if (arg === "--init") {
      args.init = true;
    } else if (arg === "--validate") {
      args.validate = true;
    } else if (arg === "--no-watch") {
      args.watchSettings = false;
    } else if (!arg.startsWith("--") && !arg.startsWith("-")) {
      args.dir = arg;
      args.dirSpecified = true;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Usage: mdsvr [dir] [options]

Options:
  [dir]              Root directory to serve (default: .)
  -p, --port N       Port number (default: 1800)
  --host H           Bind address (default: localhost)
  -o, --open         Auto-open browser
  -s, --silent       Suppress console output
  --init             Create a starter settings.json in [dir]
  --validate         Validate settings.json and exit
  --no-watch         Disable settings.json hot-reload
  -v, --version      Print version
  -h, --help         Print this help

Examples:
  mdsvr ./docs
  mdsvr ./notes --port 4000 --open
  mdsvr . --host 0.0.0.0 --port 8080
  mdsvr ./docs --init
  mdsvr ./docs --validate
`);
}

async function getVersion(): Promise<string> {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const pkgPath = path.join(__dirname, "..", "package.json");
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
    return pkg.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

async function openBrowser(url: string): Promise<void> {
  const { exec } = await import("node:child_process");
  const platform = process.platform;
  const cmd =
    platform === "darwin"
      ? `open`
      : platform === "win32"
        ? `start`
        : `xdg-open`;
  exec(`${cmd} "${url}"`);
}

async function initSettings(dir: string): Promise<void> {
  const settingsPath = path.join(dir, "settings.json");
  const defaultSettings = generateDefaultSettings();
  await writeFile(
    settingsPath,
    JSON.stringify(defaultSettings, null, 2),
    "utf-8",
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.version) {
    const version = await getVersion();
    console.log(`mdsvr v${version}`);
    process.exit(0);
  }

  // If no directory specified, serve default-docs directory
  let dir = args.dir;
  if (!args.dirSpecified) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    dir = path.join(__dirname, "..", "default-docs");
  }

  const absoluteDir = path.resolve(dir);

  // Handle --init
  if (args.init) {
    try {
      await initSettings(absoluteDir);
      console.log(`\n  ✔ Created ${args.dir}/settings.json with defaults`);
      console.log(`  ✔ Run \`npx mdsvr ${args.dir}\` to start\n`);
      process.exit(0);
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  }

  // Handle --validate
  if (args.validate) {
    try {
      const result = await validateSettingsFile(absoluteDir);
      if (result.valid) {
        console.log(`\n  ✔ settings.json is valid\n`);
        process.exit(0);
      } else {
        console.log(`\n  ✖ settings.json has errors:`);
        result.errors?.forEach((e) => console.log(`    - ${e}`));
        console.log();
        process.exit(1);
      }
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  }

  try {
    const server = await createServer(dir, {
      port: args.port,
      host: args.host,
      open: args.open,
      silent: args.silent,
      watchSettings: args.watchSettings,
    });

    const version = await getVersion();
    const settings = server.settings;

    if (!args.silent) {
      console.log(`\n  mdsvr v${version}\n`);
      console.log(`  Local:    ${server.url}`);

      const networkAddr = getNetworkAddress();
      if (args.host !== "localhost" && networkAddr) {
        console.log(`  Network:  http://${networkAddr}:${server.port}`);
      }

      console.log(`\n  Serving  ${absoluteDir}`);
      console.log(
        `  Settings ${settings.site.title !== "mdsvr Docs" ? "loaded" : "using defaults"}`,
      );
      console.log(
        `  MDX      ${settings.mdx.enabled ? "enabled" : "disabled"}`,
      );
      console.log(
        `  Search   ${settings.search.enabled ? "enabled" : "disabled"}`,
      );
      if (settings.seo.generateSitemap) {
        console.log(`  Sitemap  ${server.url}/sitemap.xml`);
      }

      console.log(`\n  Hit Ctrl+C to stop.\n`);
    }

    if (args.open) {
      await openBrowser(server.url);
    }

    // Graceful shutdown - use once() and flag to prevent multiple shutdowns
    let isShuttingDown = false;
    process.once("SIGINT", async () => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      if (!args.silent) {
        console.log("\nShutting down...");
      }
      server.close();
      process.exit(0);
    });
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
