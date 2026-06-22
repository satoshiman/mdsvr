// Incremental OG export using hash-based change detection

import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Settings } from "../settings/index.js";

const STATE_FILE_NAME = ".mdsvr-og-state.json";

export interface OgState {
  [filePath: string]: string; // filePath -> sha256 hash
}

export interface IncrementalExportResult {
  changedFiles: number;
  skippedFiles: number;
  cleanedFiles: number;
}

/**
 * Load the OG state file from the OG output directory
 * @deprecated Use loadExportState from src/export-state.ts instead
 */
export async function loadOgState(ogOutputDir: string): Promise<OgState> {
  const statePath = path.join(ogOutputDir, STATE_FILE_NAME);
  try {
    const content = await fs.readFile(statePath, "utf-8");
    return JSON.parse(content) as OgState;
  } catch {
    // File doesn't exist or is invalid, return empty state
    return {};
  }
}

/**
 * Save the OG state file to the OG output directory
 * @deprecated Use saveExportState from src/export-state.ts instead
 */
export async function saveOgState(
  ogOutputDir: string,
  state: OgState,
): Promise<void> {
  const statePath = path.join(ogOutputDir, STATE_FILE_NAME);
  await fs.mkdir(ogOutputDir, { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
}

/**
 * Extract dependencies from markdown content
 * - Parse import statements: `import ... from '...'`
 * - Parse frontmatter for includes/references
 */
export function extractDependencies(content: string): string[] {
  const dependencies: string[] = [];

  // Extract import statements
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    dependencies.push(match[1]);
  }

  // Extract frontmatter includes/references (common patterns)
  const includeRegex = /(?:include|reference|file):\s*['"]([^'"]+)['"]/gi;
  while ((match = includeRegex.exec(content)) !== null) {
    dependencies.push(match[1]);
  }

  return dependencies;
}

/**
 * Calculate hash of settings that affect OG generation
 */
export async function calculateSettingsHash(
  rootDir: string,
  settings: Settings,
): Promise<string> {
  const settingsPath = path.join(rootDir, "_mdsvr/settings.json");
  let settingsContent = "";

  try {
    settingsContent = await fs.readFile(settingsPath, "utf-8");
  } catch {
    // If settings file doesn't exist, use the settings object
    settingsContent = JSON.stringify(settings);
  }

  // Only include settings that affect OG generation
  const ogRelevantSettings = {
    site: {
      title: settings.site.title,
    },
    appearance: {
      accentColor: settings.appearance.accentColor,
    },
    seo: {
      og: settings.seo.og,
    },
  };

  const combined = JSON.stringify(ogRelevantSettings);
  return createHash("sha256").update(combined).digest("hex");
}

/**
 * Calculate hash for a file including its dependencies
 */
export async function calculateFileHash(
  filePath: string,
  rootDir: string,
  settings: Settings,
  visited: Set<string> = new Set(),
): Promise<string> {
  // Prevent infinite recursion from circular dependencies
  if (visited.has(filePath)) {
    return "";
  }
  visited.add(filePath);

  try {
    // 1. Read file content
    const content = await fs.readFile(filePath, "utf-8");

    // 2. Extract dependencies
    const dependencies = extractDependencies(content);

    // 3. Calculate hash of dependencies (recursive)
    const depHashes: string[] = [];
    for (const dep of dependencies) {
      // Resolve relative paths
      const depPath = path.resolve(path.dirname(filePath), dep);
      const depHash = await calculateFileHash(
        depPath,
        rootDir,
        settings,
        visited,
      );
      if (depHash) {
        depHashes.push(depHash);
      }
    }

    // 4. Include settings hash
    const settingsHash = await calculateSettingsHash(rootDir, settings);

    // 5. Combine all hashes
    const combined = [content, ...depHashes, settingsHash].join("|");

    return createHash("sha256").update(combined).digest("hex");
  } catch {
    // If file doesn't exist or can't be read, return empty hash
    return "";
  }
}

/**
 * Generate OG filename from file path
 * e.g., /docs/README.md -> docs-readme-og.jpg
 */
export function generateOgFilename(
  filePath: string,
  format: "jpg" | "png" = "jpg",
): string {
  // Normalize path and remove leading slash
  const normalized = filePath.replace(/^\//, "").replace(/\\/g, "/");

  // Convert path segments to kebab-case
  const segments = normalized.split("/").map((segment) => {
    return segment.toLowerCase().replace(/\.(md|mdx)$/, "");
  });

  const filename = segments.join("-") + `-og.${format}`;
  return filename;
}

/**
 * Clean up orphaned OG files (files that exist but are not in current state)
 * @deprecated Use cleanupOrphanedFiles from src/export-state.ts instead
 */
export async function cleanupOrphanedOG(
  ogOutputDir: string,
  currentState: OgState,
  format: "jpg" | "png" = "jpg",
): Promise<number> {
  try {
    const existingOGFiles = await fs.readdir(ogOutputDir);

    // Generate expected OG filenames from current state
    const expectedOGFiles = Object.keys(currentState).map((filePath) => {
      return generateOgFilename(filePath, format);
    });

    // Find orphaned files (exist but not expected)
    const orphanedFiles = existingOGFiles.filter((file) => {
      return (
        !expectedOGFiles.includes(file) &&
        file !== STATE_FILE_NAME &&
        file !== "index.html" &&
        (file.endsWith(`.jpg`) || file.endsWith(`.png`))
      );
    });

    // Delete orphaned files
    for (const file of orphanedFiles) {
      await fs.unlink(path.join(ogOutputDir, file));
    }

    return orphanedFiles.length;
  } catch {
    // If directory doesn't exist or other error, return 0
    return 0;
  }
}

/**
 * Scan all markdown files in a directory recursively
 */
export async function scanMarkdownFiles(
  rootDir: string,
  settings: Settings,
): Promise<string[]> {
  const files: string[] = [];

  async function scanDir(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip hidden files/directories
      if (entry.name.startsWith(".") || entry.name.startsWith("_")) {
        continue;
      }

      // Skip blocked extensions
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (settings.files.extensions.block.includes(ext)) {
          continue;
        }
      }

      if (entry.isDirectory()) {
        // Skip static folders
        if (settings.files.staticFolders.includes(entry.name)) {
          continue;
        }
        await scanDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === ".md" || (ext === ".mdx" && settings.mdx.enabled)) {
          files.push(fullPath);
        }
      }
    }
  }

  await scanDir(rootDir);
  return files;
}
