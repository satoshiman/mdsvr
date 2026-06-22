import { promises as fs, type Dirent } from "node:fs";
import path from "node:path";
import {
  renderMarkdown,
  type MarkdownResult,
  extractSeoData,
} from "../renderer/markdown.js";
import { renderMdx, type MdxRenderResult } from "../renderer/mdx.js";
import { renderPage } from "../template/index.js";
import { buildSidebar, type NavItem } from "../template/sidebar.js";
import { renderDirectory } from "../directory.js";
import { buildSearchIndex } from "./search-index.js";
import type { Settings } from "../settings/index.js";
import {
  generateOgImage,
  getOgImagePath,
  type OgImageData,
} from "../og/index.js";
import {
  loadExportState,
  saveExportState,
  migrateOldState,
  cleanupOrphanedFiles,
  calculateFileHash,
  calculateSettingsHash,
  type ExportState,
  type PageState,
  type OgState,
} from "../export-state.js";

export interface ExportOptions {
  rootDir: string;
  outputDir: string;
  settings: Settings;
  silent?: boolean;
  forceOg?: boolean;
}

interface DirInfo {
  outputPath: string;
  urlPath: string;
  hasIndex: boolean;
}

interface PageInfo {
  urlPath: string;
  outputPath: string;
  sourcePath: string;
  title: string;
  description?: string;
}

function withBasePath(href: string, settings: Settings): string {
  const basePath = settings.generate.basePath || "";
  if (!basePath) return href;
  const normalizedBase = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;
  return normalizedBase + href;
}

export async function exportStaticSite(options: ExportOptions): Promise<void> {
  let {
    rootDir,
    outputDir,
    settings,
    silent = false,
    forceOg = false,
  } = options;

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

    // 1.5. Clean up old HTML files (always delete all HTML before re-export)
    await cleanupOldHtml(absOutputDir, silent);

    // 1.6. Load and migrate old OG state if needed
    let oldOgState: Record<string, OgState> = {};
    const oldState = await loadExportState(absRootDir);
    const migratedState = await migrateOldState(absRootDir, absOutputDir);
    if (migratedState) {
      oldOgState = migratedState.og;
      if (!silent) {
        console.log(`  📦 Migrated old OG state to new format`);
      }
    } else {
      oldOgState = oldState.og;
    }

    // 1.7. Check if settings changed - if so, force full OG export
    const currentSettingsHash = await calculateSettingsHash(absRootDir);
    if (
      oldState.settingsHash &&
      oldState.settingsHash !== currentSettingsHash
    ) {
      if (!silent) {
        console.log(`  ⚙️  Settings changed, forcing full OG export`);
      }
      // Clear old OG state to force regeneration
      oldOgState = {};
      forceOg = true;
    }

    // 2. Process all markdown files
    let processedCount = 0;
    const dirMap = new Map<string, DirInfo>();
    const pageInfos: PageInfo[] = [];
    const currentOgState: Record<string, OgState> = {};
    await processDirectory(
      absRootDir,
      absOutputDir,
      absRootDir,
      absOutputDir,
      settings,
      silent,
      dirMap,
      pageInfos,
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

        const autoIndexOutputPath = path.join(dirInfo.outputPath, "index.html");

        // Add to pageInfos so OG images are generated for auto-index pages
        pageInfos.push({
          urlPath: dirInfo.urlPath,
          outputPath: autoIndexOutputPath,
          sourcePath: "", // Auto-index pages have no source file
          title: dirInfo.urlPath ? `Index of ${dirInfo.urlPath}` : "Index",
          description: settings.site.description,
        });

        if (!silent) {
          const relativeOutputPath = path.relative(
            absOutputDir,
            autoIndexOutputPath,
          );
          console.log(`  ✓ ${relativeOutputPath} (auto-generated)`);
        }
      }
    }

    // 4. Generate OG images if enabled
    if (settings.seo.og?.enabled) {
      if (!silent) {
        console.log(`\n  🖼️  Generating OG images...`);
      }
      const oldStateFull: ExportState = {
        settingsHash: oldState.settingsHash,
        html: {},
        og: oldOgState,
      };
      const newStateFull: ExportState = {
        settingsHash: currentSettingsHash,
        html: {},
        og: currentOgState,
      };
      await generateOgImages(
        pageInfos,
        absOutputDir,
        absRootDir,
        settings,
        silent,
        forceOg,
        newStateFull,
        oldStateFull,
      );
    }

    // 5. Cleanup orphaned OG files after generating new content
    const oldStateFull: ExportState = {
      settingsHash: oldState.settingsHash,
      html: {},
      og: oldOgState,
    };
    const newStateFull: ExportState = {
      settingsHash: currentSettingsHash,
      html: {},
      og: currentOgState,
    };
    const cleanupResult = await cleanupOrphanedFiles(
      absOutputDir,
      oldStateFull,
      newStateFull,
    );
    if (cleanupResult.deleted.length > 0 && !silent) {
      console.log(
        `  🧹 Cleaned up ${cleanupResult.deleted.length} orphaned OG files`,
      );
    }
    if (cleanupResult.deletedDirs.length > 0 && !silent) {
      console.log(
        `  🧹 Cleaned up ${cleanupResult.deletedDirs.length} empty directories`,
      );
    }

    // 6. Generate search-index.json if search is enabled
    if (settings.search.enabled) {
      const searchIndex = await buildSearchIndex(absRootDir, settings);
      const searchIndexPath = path.join(absOutputDir, "search-index.json");
      await fs.writeFile(searchIndexPath, JSON.stringify(searchIndex), "utf-8");
      if (!silent) {
        console.log(`  ✓ search-index.json (${searchIndex.length} entries)`);
      }
    }

    // 7. Save new export state (only OG state)
    const finalState: ExportState = {
      settingsHash: currentSettingsHash,
      html: {},
      og: currentOgState,
    };
    await saveExportState(absRootDir, finalState);

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
  outputDir: string,
  settings: Settings,
  silent: boolean,
  dirMap: Map<string, DirInfo>,
  pageInfos: PageInfo[],
  updateCount: (count: number) => void,
  count: number = 0,
): Promise<number> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  // Track this directory for auto-index generation
  const relativePath = path.relative(rootDir, dirPath);
  const urlPath =
    "/" + relativePath.replace(/\\/g, "/") + (relativePath ? "/" : "");
  const finalUrlPath = urlPath === "//" ? "/" : urlPath;
  dirMap.set(dirPath, {
    outputPath,
    urlPath: withBasePath(finalUrlPath, settings),
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
      if (isStaticFolder(entry.name, settings)) {
        // Copy static folder as-is (all files regardless of extension)
        await copyStaticFolder(fullPath, outputFilePath, rootDir, silent);
      } else {
        // Create directory in output and process normally
        await fs.mkdir(outputFilePath, { recursive: true });
        count = await processDirectory(
          fullPath,
          outputFilePath,
          rootDir,
          outputDir,
          settings,
          silent,
          dirMap,
          pageInfos,
          updateCount,
          count,
        );
      }
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
          let rawUrlPath =
            "/" + path.relative(rootDir, dirPath).replace(/\\/g, "/");
          if (rawUrlPath !== "/") {
            rawUrlPath += "/";
          }
          urlPath = withBasePath(rawUrlPath, settings);
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
          const rawUrlPath =
            "/" +
            path
              .relative(rootDir, fullPath)
              .replace(/\\/g, "/")
              .replace(/\.(md|mdx)$/, "");
          urlPath = withBasePath(rawUrlPath, settings);
        }

        const pageInfo = await renderMarkdownFile(
          fullPath,
          htmlOutputPath,
          urlPath,
          rootDir,
          outputPath,
          settings,
        );
        pageInfos.push(pageInfo);

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
  outputDir: string,
  settings: Settings,
): Promise<PageInfo> {
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
    sidebar = await buildSidebar(rootDir, urlPath, settings, true);
  }

  // Fix asset paths for subdirectories
  const fixedHtml = fixAssetPaths(result.html, urlPath);

  const html = renderPage({
    title,
    body: fixedHtml,
    filePath: urlPath,
    settings,
    frontmatter: result.frontmatter,
    toc: result.toc,
    sidebar,
    urlPath,
    isStaticExport: true,
  });

  await fs.writeFile(outputPath, html, "utf-8");

  // Return page info for OG generation
  return {
    urlPath,
    outputPath,
    sourcePath: filePath,
    title,
    description: result.frontmatter.description as string | undefined,
  };
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

function isStaticFolder(folderName: string, settings: Settings): boolean {
  return settings.files.staticFolders.includes(folderName);
}

async function copyStaticFolder(
  srcDir: string,
  destDir: string,
  rootDir: string,
  silent: boolean,
): Promise<void> {
  await fs.mkdir(destDir, { recursive: true });

  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    const relativePath = path.relative(rootDir, srcPath);

    // Skip hidden files
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyStaticFolder(srcPath, destPath, rootDir, silent);
    } else {
      const data = await fs.readFile(srcPath);
      await fs.writeFile(destPath, data);
      if (!silent) {
        console.log(`  ✓ ${relativePath} → ${relativePath}`);
      }
    }
  }
}

function extractFirstHeading(content: string): string | null {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  return null;
}

function fixAssetPaths(html: string, urlPath: string): string {
  // Calculate the root path for assets (everything up to the current directory)
  const pathSegments = urlPath.split("/").filter(Boolean);

  // Build the absolute assets path based on the current directory structure
  let absoluteAssetsPath = "";

  if (pathSegments.length === 0) {
    // Root level: /assets/
    absoluteAssetsPath = "/assets/";
  } else {
    // Subdirectory: assets are at the root level of the project
    // Use all segments except the last one to build the path to assets
    // For /k8s/LFS158-docs/12/, assets should be at /k8s/LFS158-docs/assets/
    const rootSegments = pathSegments.slice(0, -1);
    if (rootSegments.length > 0) {
      absoluteAssetsPath = "/" + rootSegments.join("/") + "/assets/";
    } else {
      absoluteAssetsPath = "/assets/";
    }
  }

  // Replace all relative assets/ paths with absolute paths
  return html.replace(
    /(src|href|data-src|poster|content)="assets\//g,
    `$1="${absoluteAssetsPath}`,
  );
}

function humanizeFilename(filename: string): string {
  return filename.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Generate OG images for all pages
 */
async function generateOgImages(
  pageInfos: PageInfo[],
  outputDir: string,
  rootDir: string,
  settings: Settings,
  silent: boolean,
  forceOg: boolean = false,
  currentState: ExportState,
  oldState: ExportState,
): Promise<void> {
  const ogDir = path.join(outputDir, "public", "assets", "og");
  const format = settings.seo.og?.imageFormat || "jpg";
  const ogSettings = settings.seo.og;

  let generatedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const pageInfo of pageInfos) {
    const ogImagePath = getOgImagePath(
      pageInfo.urlPath,
      ogDir,
      format,
      settings.generate.basePath,
    );

    // Build OG image data
    const ogData: OgImageData = {
      title: pageInfo.title,
      description: pageInfo.description,
      siteName: settings.site.title,
      urlPath: pageInfo.urlPath,
      accentColor: settings.appearance.accentColor,
      fontFamily: ogSettings?.fontFamily || "Inter",
      backgroundColor: ogSettings?.colors?.background || "#0a0a0f",
      textColor: ogSettings?.colors?.text || "#ffffff",
    };

    // For incremental export, check if file has changed
    let shouldGenerate = forceOg;
    let fileHash = "";

    // Calculate hash for the source file and populate currentState.og
    if (pageInfo.sourcePath) {
      try {
        fileHash = await calculateFileHash(pageInfo.sourcePath);
      } catch {
        fileHash = "";
      }
    }

    const relativeOgPath = path.relative(outputDir, ogImagePath);
    currentState.og[pageInfo.urlPath] = {
      outputPath: relativeOgPath,
      hash: fileHash || "auto-index",
    };

    // Check if hash changed by comparing with old state (only if not forcing)
    if (!forceOg) {
      // Check if OG image file exists
      try {
        await fs.access(ogImagePath);
      } catch {
        // File doesn't exist, must generate
        shouldGenerate = true;
      }

      if (!shouldGenerate && pageInfo.sourcePath && fileHash) {
        const oldHash = oldState.og[pageInfo.urlPath]?.hash;
        if (oldHash !== fileHash) {
          shouldGenerate = true;
        }
      } else if (!shouldGenerate) {
        // Auto-index pages have no source, always generate
        shouldGenerate = true;
      }
    }

    if (shouldGenerate) {
      // Generate the OG image
      const result = await generateOgImage(ogData, {
        outputPath: ogImagePath,
        format,
        quality: 85,
      });

      if (result.success) {
        generatedCount++;
        if (!silent) {
          const displayPath = path.relative(outputDir, ogImagePath);
          console.log(`  ✓ OG image: ${displayPath}`);
        }
      } else {
        failedCount++;
        if (!silent) {
          console.log(
            `  ✗ OG image failed: ${pageInfo.urlPath} (${result.error})`,
          );
        }
      }
    } else {
      skippedCount++;
      if (!silent) {
        console.log(`  ⊘ OG image skipped: ${pageInfo.urlPath} (unchanged)`);
      }
    }
  }

  // Add empty index.html to prevent directory listing
  await createEmptyIndexFile(ogDir);

  if (!silent) {
    if (forceOg) {
      console.log(
        `  ✓ OG images: ${generatedCount} generated, ${failedCount} failed (forced)`,
      );
    } else {
      console.log(
        `  ✓ OG images: ${generatedCount} changed, ${skippedCount} skipped, ${failedCount} failed`,
      );
    }
  }
}

/**
 * Create an empty index.html file to prevent directory listing
 */
async function createEmptyIndexFile(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    const indexPath = path.join(dirPath, "index.html");
    // Check if file exists first
    try {
      await fs.access(indexPath);
      // File exists, don't overwrite
    } catch {
      // File doesn't exist, create empty one
      await fs.writeFile(indexPath, "", "utf-8");
    }
  } catch {
    // Ignore errors
  }
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
    sidebar = await buildSidebar(rootDir, dirInfo.urlPath, settings, true);
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
    isStaticExport: true,
  });

  const indexPath = path.join(dirInfo.outputPath, "index.html");
  await fs.writeFile(indexPath, html, "utf-8");
}

/**
 * Clean up old HTML files (delete all HTML files before re-export)
 */
async function cleanupOldHtml(
  outputDir: string,
  silent: boolean,
): Promise<void> {
  async function deleteHtmlFiles(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip og directory - it's handled separately
          if (entry.name === "og") {
            continue;
          }
          await deleteHtmlFiles(fullPath);
          // Try to delete empty directory
          try {
            await fs.rmdir(fullPath);
          } catch {
            // Directory not empty, skip
          }
        } else if (entry.isFile() && entry.name === "index.html") {
          await fs.unlink(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  await deleteHtmlFiles(outputDir);
  if (!silent) {
    console.log(`  🧹 Cleaned up old HTML files`);
  }
}
