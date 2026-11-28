import {
  promises as fs,
  realpathSync as fsRealpathSync,
  type Dirent,
} from "node:fs";
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
import { convertMarkdownLinks, createLinkResolver } from "./link-transform.js";
import { normalizeBasePath } from "./seo/url.js";
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
  const stat = await fs.stat(sourcePath);
  const ext = path.extname(sourcePath).toLowerCase();

  let result: MarkdownResult | MdxRenderResult;
  if (ext === ".mdx" && settings.mdx.enabled) {
    try {
      result = await renderMdx(content, settings);
    } catch (err) {
      // A broken .mdx file renders an inline error instead of a 500 or an
      // aborted export — same contract as a broken ```quiz block.
      const message = err instanceof Error ? err.message : String(err);
      result = {
        html: `<div class="callout callout-danger"><strong style="display: block; margin-bottom: 8px;">MDX render error</strong><div><pre><code>${escapeHtmlText(message)}</code></pre></div></div>`,
        frontmatter: {},
        toc: [],
      };
    }
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

  // Rebase relative links/assets against the source file's directory and
  // emit canonical site-relative routes (clean URLs). This runs in both
  // modes: canonical page URLs are trailing-slash directories, so raw
  // relative paths like `../assets/x.png` resolve one level too deep in
  // the browser. The dev router serves the emitted routes via the .md
  // fallback, same as a static export.
  const body = transformLinks(
    result.html,
    sourcePath,
    rootDir,
    isStatic ? settings.generate.basePath : "",
  );

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
    // Filesystem dates feed `article:*` meta and JSON-LD when frontmatter
    // omits them — birthtime when the FS reports it, else mtime.
    fileDates: {
      published:
        stat.birthtimeMs > 0 && stat.birthtime <= stat.mtime
          ? stat.birthtime
          : stat.mtime,
      modified: stat.mtime,
    },
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
  const description = `Directory listing for ${title}`;

  const html = renderPage({
    title,
    body: renderDirectory({
      urlPath,
      entries: entriesWithSize,
      title,
      basePath: isStatic ? settings.generate.basePath : undefined,
    }),
    filePath: urlPath,
    settings,
    frontmatter: { description },
    kind: "directory",
    urlPath,
    sidebar,
    isStaticExport: isStatic,
  });

  return { html, title, frontmatter: {}, toc: [], description };
}

export function isHidden(filename: string, settings: Settings): boolean {
  for (const pattern of settings.files.extensions.hidden) {
    if (matchHiddenPattern(filename, pattern)) return true;
  }
  if (filename.startsWith("_") || filename.startsWith(".")) return true;
  return false;
}

/** `*` in a hidden pattern matches any run of characters (glob-style). */
function matchHiddenPattern(filename: string, pattern: string): boolean {
  if (!pattern.includes("*")) return filename === pattern;
  const regex = new RegExp(
    `^${pattern
      .split("*")
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*")}$`,
  );
  return regex.test(filename);
}

export function isBlocked(ext: string, settings: Settings): boolean {
  return settings.files.extensions.block.includes(ext);
}

export function isAllowedExtension(ext: string, settings: Settings): boolean {
  return settings.files.extensions.serve.includes(ext);
}

export { extractFirstHeading } from "./seo/extract.js";

/**
 * Rebase every relative href/src in rendered body HTML against the source
 * file's directory, emitting canonical site-relative routes. Unresolvable
 * links are kept as-is and logged (they surface in --validate-md too).
 */
function transformLinks(
  html: string,
  sourcePath: string,
  rootDir: string,
  basePath: string,
): string {
  // Resolve symlinks on both sides so path.relative works even when the
  // caller passed a symlinked rootDir (e.g. /var → /private/var on macOS)
  // while the router resolved the source file to its real path.
  const realRoot = realpathSyncSafe(rootDir);
  const realSource = realpathSyncSafe(sourcePath);
  const relDir = path
    .relative(realRoot, path.dirname(realSource))
    .replace(/\\/g, "/");
  if (relDir.startsWith("..") || path.isAbsolute(relDir)) {
    console.warn(
      `[mdsvr] ${path.basename(sourcePath)}: source file is outside the docs root — links left unchanged`,
    );
    return html;
  }
  const result = convertMarkdownLinks(html, {
    sourceDirUrlPath: relDir ? `/${relDir}` : "/",
    rootDir,
    resolveFile: createLinkResolver(),
    basePath: normalizeBasePath(basePath),
  });
  if (result.warnings.length > 0) {
    const relSource = path.relative(rootDir, sourcePath);
    for (const w of result.warnings) {
      console.warn(
        `[mdsvr] ${relSource}: link "${w.url}" ${
          w.reason === "outside-root"
            ? "resolves outside the docs root"
            : `target not found (${w.resolvedUrlPath})`
        }`,
      );
    }
  }
  return result.html;
}

function realpathSyncSafe(p: string): string {
  try {
    return fsRealpathSync(p);
  } catch {
    return p;
  }
}

function escapeHtmlText(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  };
  return text.replace(/[&<>"]/g, (c) => map[c]);
}

export function humanizeFilename(filename: string): string {
  return filename
    .replace(/^\d+\./, "")
    .replace(/[-_]/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}
