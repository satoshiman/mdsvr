// Centralized export state management for HTML and OG files

import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { generateDefaultSettings } from "./settings/index.js";

const STATE_FILE_NAME = "_mdsvr/export-state.json";
const OLD_STATE_FILE_NAME = ".mdsvr-og-state.json";

export interface ExportState {
  settingsHash: string; // sha256 of settings.json
  html: Record<string, PageState>;
  og: Record<string, OgState>;
}

export interface PageState {
  outputPath: string; // Relative to export dir
  sourcePath: string; // Relative to root dir
  hash: string; // sha256 of source file
}

export interface OgState {
  outputPath: string; // Relative to export dir
  hash: string; // sha256 of source file
}

export interface CleanupResult {
  deleted: string[];
  deletedDirs: string[];
}

/**
 * Load the export state file from the root directory
 */
export async function loadExportState(rootDir: string): Promise<ExportState> {
  const statePath = path.join(rootDir, STATE_FILE_NAME);
  try {
    const content = await fs.readFile(statePath, "utf-8");
    return JSON.parse(content) as ExportState;
  } catch {
    // File doesn't exist or is invalid, return empty state
    return { settingsHash: "", html: {}, og: {} };
  }
}

/**
 * Save the export state file to the root directory
 */
export async function saveExportState(
  rootDir: string,
  state: ExportState,
): Promise<void> {
  const statePath = path.join(rootDir, STATE_FILE_NAME);
  await fs.mkdir(path.join(rootDir, "_mdsvr"), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
}

/**
 * Migrate old OG state format to new export state format
 */
export async function migrateOldState(
  rootDir: string,
  exportDir: string,
): Promise<ExportState | null> {
  const oldOgDir = path.join(exportDir, "public", "og");
  const oldStatePath = path.join(oldOgDir, OLD_STATE_FILE_NAME);

  try {
    const content = await fs.readFile(oldStatePath, "utf-8");
    const oldOgState = JSON.parse(content) as Record<string, string>;

    // Convert old format to new format
    const newState: ExportState = {
      settingsHash: "",
      html: {},
      og: {},
    };

    for (const [filePath, hash] of Object.entries(oldOgState)) {
      // Generate OG filename from file path
      const ogFilename = generateOgFilename(filePath, "jpg");
      newState.og[filePath] = {
        outputPath: path.join("public", "og", ogFilename),
        hash,
      };
    }

    // Delete old state file after migration
    await fs.unlink(oldStatePath);

    return newState;
  } catch {
    // Old state file doesn't exist or is invalid, return null
    return null;
  }
}

/**
 * Generate OG filename from file path
 * e.g., /docs/README.md -> docs-readme-og.jpg
 */
function generateOgFilename(
  filePath: string,
  format: "jpg" | "png" = "jpg",
): string {
  const normalized = filePath.replace(/^\//, "").replace(/\\/g, "/");
  const segments = normalized.split("/").map((segment) => {
    return segment.toLowerCase().replace(/\.(md|mdx)$/, "");
  });
  return segments.join("-") + `-og.${format}`;
}

/**
 * Calculate hash for a file
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return createHash("sha256").update(content).digest("hex");
  } catch {
    return "";
  }
}

/**
 * Calculate hash of settings file
 * If settings file doesn't exist, use default settings hash
 */
export async function calculateSettingsHash(rootDir: string): Promise<string> {
  const settingsPath = path.join(rootDir, "_mdsvr/settings.json");
  try {
    const content = await fs.readFile(settingsPath, "utf-8");
    const parsed = JSON.parse(content);
    delete parsed.$schema; // Exclude schema from hash
    return createHash("sha256").update(JSON.stringify(parsed)).digest("hex");
  } catch {
    // No settings file, use hash of default settings
    const defaultSettings = generateDefaultSettings();
    const { $schema, ...settingsWithoutSchema } = defaultSettings as any;
    return createHash("sha256")
      .update(JSON.stringify(settingsWithoutSchema))
      .digest("hex");
  }
}

/**
 * Clean up orphaned files (files that exist in old state but not in new state)
 */
export async function cleanupOrphanedFiles(
  exportDir: string,
  oldState: ExportState,
  newState: ExportState,
): Promise<CleanupResult> {
  const deleted: string[] = [];
  const deletedDirs: string[] = [];

  // Cleanup HTML
  for (const [urlPath, pageState] of Object.entries(oldState.html)) {
    if (!newState.html[urlPath]) {
      const fullPath = path.join(exportDir, pageState.outputPath);
      try {
        await fs.unlink(fullPath);
        deleted.push(fullPath);
        await cleanupEmptyDir(path.dirname(fullPath), exportDir, deletedDirs);
      } catch {
        // File might not exist, ignore
      }
    }
  }

  // Cleanup OG
  for (const [urlPath, ogState] of Object.entries(oldState.og)) {
    if (!newState.og[urlPath]) {
      const fullPath = path.join(exportDir, ogState.outputPath);
      try {
        await fs.unlink(fullPath);
        deleted.push(fullPath);
        await cleanupEmptyDir(path.dirname(fullPath), exportDir, deletedDirs);
      } catch {
        // File might not exist, ignore
      }
    }
  }

  return { deleted, deletedDirs };
}

/**
 * Recursively delete empty directories up to rootDir
 */
async function cleanupEmptyDir(
  dir: string,
  rootDir: string,
  deletedDirs: string[],
): Promise<void> {
  while (dir !== rootDir) {
    try {
      const entries = await fs.readdir(dir);
      if (entries.length === 0) {
        await fs.rmdir(dir);
        deletedDirs.push(dir);
        dir = path.dirname(dir);
      } else {
        break;
      }
    } catch {
      // Directory might not exist, stop
      break;
    }
  }
}
