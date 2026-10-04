import { promises as fs, type Dirent } from "node:fs";
import path from "node:path";
import {
  renderMarkdown,
  type MarkdownResult,
  type TocItem,
} from "./renderer/markdown.js";
import { renderMdx, type MdxRenderResult } from "./renderer/mdx.js";
import { extractFirstHeading } from "./seo/extract.js";
import { renderPage } from "./template/index.js";
import { buildSidebar, type NavItem } from "./template/sidebar.js";
import { renderDirectory } from "./directory.js";
import { convertMarkdownLinks } from "./link-transform.js";
import type { Settings } from "./settings/index.js";

/**
 * Unified page-rendering service (ADR-0007).
 * "dynamic" mode is used by the HTTP adapter (router); "static" mode is used
 * by the static exporter. Static mode additionally rewrites asset paths and
 * converts .md/.mdx links to clean URLs.
 */
export type RenderMode = "dynamic" | "static";

export interface RenderPageInput {
  sourcePath: string;
  urlPath: string;
  rootDir: string;
  settings: Settings;
  mode: RenderMode;
}

export interface RenderedPage {
  html: string;
  title: string;
  frontmatter: Record<string, unknown>;
  toc: TocItem[];
  description?: string;
}

export async function renderPageService(
  input: RenderPageInput,
): Promise<RenderedPage> {
  const { sourcePath, urlPath, rootDir, settings, mode } = input;
  const isStatic = mode === "static";

  const content = await fs.readFile(sourcePath, "utf-8");
  const ext = path.extname(sourcePath).toLowerCase();

  let result: MarkdownResult | MdxRenderResult;
  if (ext === ".mdx" && settings.mdx.enabled) {
    result = await renderMdx(content, settings);
  } else {
    result = renderMarkdown(content, settings);
  }

  const title =
    (result.frontmatter.title as string) ||
    extractFirstHeading(content) ||
    humanizeFilename(path.basename(sourcePath, ext));

  let sidebar: NavItem[] = [];
  if (settings.navigation.sidebar.enabled) {
    sidebar = await buildSidebar(rootDir, urlPath, settings, isStatic);
  }

  let body = result.html;
  if (isStatic) {
    body = convertMarkdownLinks(fixAssetPaths(body, urlPath));
  } else if (settings.generate.cleanUrls) {
    // Preview static-export output: rewrite .md/.mdx links to clean URLs
    body = convertMarkdownLinks(body);
  }

  const html = renderPage({
    title,
    body,
    filePath: urlPath,
    settings,
    frontmatter: result.frontmatter,
    content,
    kind: "document",
    toc: result.toc,
    sidebar,
    urlPath,
    isStaticExport: isStatic,
  });

  return {
    html,
    title,
    frontmatter: result.frontmatter,
    toc: result.toc,
    description: result.frontmatter.description as string | undefined,
  };
}

export interface RenderDirectoryPageInput {
  /** Directory whose entries are listed (source dir when dynamic, output dir when static). */
  listDir: string;
  urlPath: string;
  rootDir: string;
  settings: Settings;
  mode: RenderMode;
  /** Extra filter applied to entry names before rendering. */
  isEntryVisible?: (entry: Dirent) => boolean;
  /** Override the page title (defaults to a humanized directory name). */
  title?: string;
}

export async function renderDirectoryPage(
  input: RenderDirectoryPageInput,
): Promise<RenderedPage> {
  const {
    listDir,
    urlPath,
    rootDir,
    settings,
    mode,
    isEntryVisible,
    title: titleOverride,
  } = input;
  const isStatic = mode === "static";

  const entries = await fs.readdir(listDir, { withFileTypes: true });

  const visibleEntries = entries.filter(
    (entry) =>
      !isHidden(entry.name, settings) && (isEntryVisible?.(entry) ?? true),
  );

  const entriesWithSize = await Promise.all(
    visibleEntries.map(async (entry: Dirent & { size?: number }) => {
      if (entry.isFile()) {
        const fullPath = path.join(listDir, entry.name);
        const stat = await fs.stat(fullPath);
        return Object.assign(entry, { size: stat.size });
      }
      return Object.assign(entry, { size: 0 });
    }),
  );

  let sidebar: NavItem[] = [];
  if (settings.navigation.sidebar.enabled) {
    sidebar = await buildSidebar(rootDir, urlPath, settings, isStatic);
  }

  const dirName = urlPath
    ? path.basename(urlPath.replace(/\/+$/, "")) || urlPath
    : "";
  const title =
    titleOverride ?? (dirName ? humanizeFilename(dirName) : "Index");

  const html = renderPage({
    title,
    body: renderDirectory({ urlPath, entries: entriesWithSize }),
    filePath: urlPath,
    settings,
    kind: "directory",
    urlPath,
    sidebar,
    isStaticExport: isStatic,
  });

  return { html, title, frontmatter: {}, toc: [] };
}

export function isHidden(filename: string, settings: Settings): boolean {
  for (const pattern of settings.files.extensions.hidden) {
    if (filename === pattern) return true;
    if (pattern.startsWith("*") && filename.endsWith(pattern.slice(1)))
      return true;
  }
  if (filename.startsWith("_") || filename.startsWith(".")) return true;
  return false;
}

export function isBlocked(ext: string, settings: Settings): boolean {
  return settings.files.extensions.block.includes(ext);
}

export function isAllowedExtension(ext: string, settings: Settings): boolean {
  return settings.files.extensions.serve.includes(ext);
}

export { extractFirstHeading } from "./seo/extract.js";

export function humanizeFilename(filename: string): string {
  return filename
    .replace(/^\d+\./, "")
    .replace(/[-_]/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function fixAssetPaths(html: string, urlPath: string): string {
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
