import { promises as fs, type Dirent } from "node:fs";
import path from "node:path";
import { renderMarkdown, type MarkdownResult } from "../renderer/markdown.js";
import { renderMdx, type MdxRenderResult } from "../renderer/mdx.js";
import { renderPage } from "../template/index.js";
import { buildSidebar, type NavItem } from "../template/sidebar.js";
import { renderDirectory } from "../directory.js";
import { buildSearchIndex } from "./search-index.js";
import type { Settings } from "../settings/index.js";

export interface ExportOptions {
  rootDir: string;
  outputDir: string;
  settings: Settings;
  silent?: boolean;
}

interface DirInfo {
  outputPath: string;
  urlPath: string;
  hasIndex: boolean;
}

export async function exportStaticSite(options: ExportOptions): Promise<void> {
  const { rootDir, outputDir, settings, silent = false } = options;

  try {
    // 1. Validate input/output directories
    const absRootDir = path.resolve(rootDir);
    const absOutputDir = path.resolve(outputDir);

    // Check if root directory exists
    const rootStat = await fs.stat(absRootDir);
    if (!rootStat.isDirectory()) {
      throw new Error(`Root directory does not exist: ${absRootDir}`);
    }

    // Create output directory if it doesn't exist
    await fs.mkdir(absOutputDir, { recursive: true });

    if (!silent) {
      console.log(`\n  📁 Export static site`);
      console.log(`  From: ${absRootDir}`);
      console.log(`  To:   ${absOutputDir}\n`);
    }

    // 2. Process all markdown files
    let processedCount = 0;
    const dirMap = new Map<string, DirInfo>();
    await processDirectory(
      absRootDir,
      absOutputDir,
      absRootDir,
      settings,
      silent,
      dirMap,
      (count) => {
        processedCount = count;
      },
    );

    // 3. Generate auto-index pages for directories without README/index
    let autoIndexCount = 0;
    for (const [dirPath, dirInfo] of dirMap) {
      if (!dirInfo.hasIndex) {
        await generateAutoIndex(dirInfo, rootDir, settings);
        autoIndexCount++;
        if (!silent) {
          console.log(
            `  ✓ ${path.relative(absOutputDir, dirInfo.outputPath)}/index.html (auto-generated)`,
          );
        }
      }
    }

    // 4. Generate search-index.json if search is enabled
    if (settings.search.enabled) {
      const searchIndex = await buildSearchIndex(absRootDir, settings);
      const searchIndexPath = path.join(absOutputDir, "search-index.json");
      await fs.writeFile(searchIndexPath, JSON.stringify(searchIndex), "utf-8");
      if (!silent) {
        console.log(`  ✓ search-index.json (${searchIndex.length} entries)`);
      }
    }

    if (!silent) {
      console.log(`\n  ✓ Export complete: ${processedCount} pages generated\n`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Export failed: ${message}`);
  }
}

async function processDirectory(
  dirPath: string,
  outputPath: string,
  rootDir: string,
  settings: Settings,
  silent: boolean,
  dirMap: Map<string, DirInfo>,
  updateCount: (count: number) => void,
  count: number = 0,
): Promise<number> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  // Track this directory for auto-index generation
  const relativePath = path.relative(rootDir, dirPath);
  const urlPath =
    "/" + relativePath.replace(/\\/g, "/") + (relativePath ? "/" : "");
  dirMap.set(dirPath, {
    outputPath,
    urlPath: urlPath === "//" ? "/" : urlPath,
    hasIndex: false,
  });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(rootDir, fullPath);
    const outputFilePath = path.join(outputPath, entry.name);

    // Skip hidden files/directories
    if (isHidden(entry.name, settings)) {
      continue;
    }

    // Skip blocked extensions
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (isBlocked(ext, settings)) {
        continue;
      }
    }

    if (entry.isDirectory()) {
      // Create directory in output
      await fs.mkdir(outputFilePath, { recursive: true });
      count = await processDirectory(
        fullPath,
        outputFilePath,
        rootDir,
        settings,
        silent,
        dirMap,
        updateCount,
        count,
      );
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();

      if (ext === ".md" || (ext === ".mdx" && settings.mdx.enabled)) {
        // Render markdown/mdx to HTML
        count++;
        const baseName = entry.name.replace(/\.(md|mdx)$/, "");
        const baseNameLower = baseName.toLowerCase();

        // For clean URLs, create folder structure:
        // features/markdown-formats.md → features/markdown-formats/index.html
        // README.md → index.html (root level)
        let htmlOutputPath: string;
        let urlPath: string;

        if (baseNameLower === "readme") {
          // README becomes index.html at current directory level
          htmlOutputPath = path.join(outputPath, "index.html");
          urlPath = "/" + path.relative(rootDir, dirPath).replace(/\\/g, "/");
          if (urlPath !== "/") {
            urlPath += "/";
          }
          // Mark directory as having index
          const dirInfo = dirMap.get(dirPath);
          if (dirInfo) {
            dirInfo.hasIndex = true;
          }
        } else {
          // Other files become folders with index.html
          const folderPath = path.join(outputPath, baseName);
          await fs.mkdir(folderPath, { recursive: true });
          htmlOutputPath = path.join(folderPath, "index.html");
          urlPath =
            "/" +
            path
              .relative(rootDir, fullPath)
              .replace(/\\/g, "/")
              .replace(/\.(md|mdx)$/, "");
        }

        await renderMarkdownFile(
          fullPath,
          htmlOutputPath,
          urlPath,
          rootDir,
          settings,
        );

        if (!silent) {
          const displayPath =
            baseNameLower === "readme"
              ? path
                  .join(path.relative(rootDir, dirPath), "index.html")
                  .replace(/^\./, "index.html")
              : path.join(
                  path.relative(rootDir, dirPath),
                  baseName,
                  "index.html",
                );
          console.log(`  ✓ ${relativePath} → ${displayPath}`);
        }
        updateCount(count);
      } else if (isAllowedExtension(ext, settings)) {
        // Copy static files
        await copyFile(fullPath, outputFilePath);
      }
    }
  }

  return count;
}

async function renderMarkdownFile(
  filePath: string,
  outputPath: string,
  urlPath: string,
  rootDir: string,
  settings: Settings,
): Promise<void> {
  const content = await fs.readFile(filePath, "utf-8");
  const ext = path.extname(filePath).toLowerCase();

  let result: MarkdownResult | MdxRenderResult;

  if (ext === ".mdx" && settings.mdx.enabled) {
    result = await renderMdx(content, settings);
  } else {
    result = renderMarkdown(content, settings);
  }

  const title =
    (result.frontmatter.title as string) ||
    extractFirstHeading(content) ||
    humanizeFilename(path.basename(filePath, ext));

  // Build sidebar if enabled
  let sidebar: NavItem[] = [];
  if (settings.navigation.sidebar.enabled) {
    sidebar = await buildSidebar(rootDir, urlPath, settings);
  }

  const html = renderPage({
    title,
    body: result.html,
    filePath: urlPath,
    settings,
    frontmatter: result.frontmatter,
    toc: result.toc,
    sidebar,
    urlPath,
  });

  await fs.writeFile(outputPath, html, "utf-8");
}

async function copyFile(src: string, dest: string): Promise<void> {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const data = await fs.readFile(src);
  await fs.writeFile(dest, data);
}

function isHidden(filename: string, settings: Settings): boolean {
  for (const pattern of settings.files.extensions.hidden) {
    if (filename === pattern) return true;
    if (pattern.startsWith("*") && filename.endsWith(pattern.slice(1)))
      return true;
  }
  if (filename.startsWith("_")) return true;
  return false;
}

function isBlocked(ext: string, settings: Settings): boolean {
  return settings.files.extensions.block.includes(ext);
}

function isAllowedExtension(ext: string, settings: Settings): boolean {
  return settings.files.extensions.serve.includes(ext);
}

function extractFirstHeading(content: string): string | null {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  return null;
}

function humanizeFilename(filename: string): string {
  return filename.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

async function generateAutoIndex(
  dirInfo: DirInfo,
  rootDir: string,
  settings: Settings,
): Promise<void> {
  // Read the output directory to list contents
  const entries = await fs.readdir(dirInfo.outputPath, { withFileTypes: true });

  // Filter hidden entries (matching server behavior in router.ts)
  // Also exclude index.html since it's generated by auto-index itself
  const visibleEntries = entries.filter(
    (entry) =>
      !entry.name.startsWith(".") &&
      !entry.name.startsWith("_") &&
      !settings.files.extensions.hidden.includes(entry.name) &&
      !(entry.isFile() && entry.name === "index.html"),
  );

  // Add size information to entries (matching server behavior)
  const entriesWithSize = await Promise.all(
    visibleEntries.map(async (entry: Dirent & { size?: number }) => {
      if (entry.isFile()) {
        const fullPath = path.join(dirInfo.outputPath, entry.name);
        const stat = await fs.stat(fullPath);
        return Object.assign(entry, { size: stat.size });
      }
      return Object.assign(entry, { size: 0 });
    }),
  );

  // Build sidebar if enabled
  let sidebar: NavItem[] = [];
  if (settings.navigation.sidebar.enabled) {
    sidebar = await buildSidebar(rootDir, dirInfo.urlPath, settings);
  }

  // Use same renderDirectory as server, wrap in renderPage
  const body = renderDirectory({
    urlPath: dirInfo.urlPath,
    entries: entriesWithSize,
  });

  const title = dirInfo.urlPath ? `Index of ${dirInfo.urlPath}` : "Index";

  const html = renderPage({
    title,
    body,
    filePath: dirInfo.urlPath,
    settings,
    urlPath: dirInfo.urlPath,
    sidebar,
  });

  const indexPath = path.join(dirInfo.outputPath, "index.html");
  await fs.writeFile(indexPath, html, "utf-8");
}
