#!/usr/bin/env node

import { createServer, getNetworkAddress } from "./server.js";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

interface ParsedArgs {
  dir: string;
  port: number;
  host: string;
  open: boolean;
  silent: boolean;
  version: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    dir: ".",
    port: 3000,
    host: "localhost",
    open: false,
    silent: false,
    version: false,
    help: false,
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
    } else if (!arg.startsWith("--") && !arg.startsWith("-")) {
      args.dir = arg;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Usage: mdsvr [dir] [options]

Options:
  [dir]              Root directory to serve (default: .)
  -p, --port N       Port number (default: 3000)
  --host H           Bind address (default: localhost)
  -o, --open         Auto-open browser
  -s, --silent       Suppress console output
  -v, --version      Print version
  -h, --help         Print this help

Examples:
  mdsvr ./docs
  mdsvr ./notes --port 4000 --open
  mdsvr . --host 0.0.0.0 --port 8080
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

  const absoluteDir = path.resolve(args.dir);

  try {
    const server = await createServer(args.dir, {
      port: args.port,
      host: args.host,
      open: args.open,
      silent: args.silent,
    });

    const version = await getVersion();

    if (!args.silent) {
      console.log(`\n  mdsvr v${version}\n`);
      console.log(`  Local:    ${server.url}`);

      const networkAddr = getNetworkAddress();
      if (args.host !== "localhost" && networkAddr) {
        console.log(`  Network:  http://${networkAddr}:${server.port}`);
      }

      console.log(`\n  Serving ${absoluteDir}`);
      console.log(`  Hit Ctrl+C to stop.\n`);
    }

    if (args.open) {
      await openBrowser(server.url);
    }

    // Graceful shutdown
    process.on("SIGINT", async () => {
      if (!args.silent) {
        console.log("\nShutting down...");
      }
      await server.close();
      process.exit(0);
    });
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
