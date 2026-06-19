import { IncomingMessage, ServerResponse } from "node:http";
import { promises as fs, createReadStream, type Dirent } from "node:fs";
import path from "node:path";
import { renderMarkdown, type MarkdownResult } from "./renderer/markdown.js";
import { renderMdx, type MdxRenderResult } from "./renderer/mdx.js";
import { renderPage } from "./template/index.js";
import { renderDirectory } from "./directory.js";
import { generateSitemap } from "./generators/sitemap.js";
import { generateFeed } from "./generators/feed.js";
import { buildSidebar, type NavItem } from "./template/sidebar.js";
import type { Settings } from "./settings/index.js";

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".webp": "image/webp",
  ".md": "text/html",
  ".mdx": "text/html",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".xml": "application/xml",
  ".zip": "application/zip",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
};

export async function route(
  req: IncomingMessage,
  res: ServerResponse,
  rootDir: string,
  settings: Settings,
  searchIndexCache: unknown,
): Promise<void> {
  // Only handle GET and HEAD
  if (req.method && !["GET", "HEAD"].includes(req.method)) {
    sendError(res, 405, "Method Not Allowed", settings);
    return;
  }

  const url = req.url || "/";
  const urlPath = decodeURIComponent(url.split("?")[0]);

  // Special routes
  if (urlPath === "/sitemap.xml" && settings.seo.generateSitemap) {
    const sitemap = await generateSitemap(rootDir, settings);
    res.writeHead(200, { "Content-Type": "application/xml" });
    res.end(sitemap);
    return;
  }

  if (urlPath === "/feed.xml" && settings.seo.generateRssFeed) {
    const feed = await generateFeed(rootDir, settings);
    res.writeHead(200, { "Content-Type": "application/rss+xml" });
    res.end(feed);
    return;
  }

  const basePath = (settings.generate.basePath || "").replace(/\/$/, "");
  const searchIndexPaths = ["/search-index.json"];
  if (basePath) searchIndexPaths.push(basePath + "/search-index.json");
  if (searchIndexPaths.includes(urlPath) && settings.search.enabled) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(searchIndexCache ?? []));
    return;
  }

  // Resolve path and check for path traversal
  const cleanUrlPath = urlPath.replace(/^\/+/, "");
  const resolvedPath = path.resolve(path.join(rootDir, cleanUrlPath));
  if (!resolvedPath.startsWith(rootDir)) {
    sendError(res, 403, "Forbidden", settings);
    return;
  }

  // Check for hidden files
  if (isHidden(path.basename(resolvedPath), settings)) {
    sendError(res, 404, "Not Found", settings);
    return;
  }

  // Check for blocked extensions
  const ext = path.extname(resolvedPath).toLowerCase();
  if (isBlocked(ext, settings)) {
    sendError(res, 403, "Forbidden", settings);
    return;
  }

  try {
    const stat = await fs.stat(resolvedPath);

    if (stat.isDirectory()) {
      await serveDirectory(res, resolvedPath, urlPath, rootDir, settings);
    } else if (ext === ".md" || (ext === ".mdx" && settings.mdx.enabled)) {
      await serveMarkdownOrMdx(res, resolvedPath, urlPath, rootDir, settings);
    } else if (isAllowedExtension(ext, settings)) {
      await serveStatic(req, res, resolvedPath, ext);
    } else {
      sendError(res, 403, "Forbidden", settings);
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      // Try .md and .mdx extensions for pretty URLs
      // Handles cases like /page -> page.md and /11.services -> 11.services.md
      const mdPath = resolvedPath + ".md";
      const mdxPath = resolvedPath + ".mdx";

      try {
        await fs.access(mdPath);
        await serveMarkdownOrMdx(res, mdPath, urlPath, rootDir, settings);
        return;
      } catch {
        // Try .mdx
        if (settings.mdx.enabled) {
          try {
            await fs.access(mdxPath);
            await serveMarkdownOrMdx(res, mdxPath, urlPath, rootDir, settings);
            return;
          } catch {
            // Fall through to 404
          }
        }
      }
      sendError(res, 404, "Not Found", settings);
    } else {
      console.error("Route error:", err);
      sendError(res, 500, "Internal Server Error", settings);
    }
  }
}

async function serveDirectory(
  res: ServerResponse,
  dirPath: string,
  urlPath: string,
  rootDir: string,
  settings: Settings,
): Promise<void> {
  // Try to find index files from settings
  for (const indexFile of settings.files.indexFiles) {
    const indexPath = path.join(dirPath, indexFile);
    try {
      await fs.access(indexPath);
      const ext = path.extname(indexFile).toLowerCase();
      if (ext === ".md" || (ext === ".mdx" && settings.mdx.enabled)) {
        await serveMarkdownOrMdx(
          res,
          indexPath,
          path.join(urlPath, indexFile),
          rootDir,
          settings,
        );
        return;
      }
    } catch {
      // Continue to next index file
    }
  }

  // Try index.html
  const indexHtml = path.join(dirPath, "index.html");
  try {
    await fs.access(indexHtml);
    await serveStatic(
      { method: "GET", url: urlPath } as IncomingMessage,
      res,
      indexHtml,
      ".html",
    );
    return;
  } catch {
    // Continue to directory listing
  }

  // Read directory contents
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  // Filter hidden entries
  const visibleEntries = entries.filter(
    (entry) => !isHidden(entry.name, settings),
  );

  // Add size information to entries
  const entriesWithSize = await Promise.all(
    visibleEntries.map(async (entry: Dirent & { size?: number }) => {
      if (entry.isFile()) {
        const fullPath = path.join(dirPath, entry.name);
        const stat = await fs.stat(fullPath);
        return Object.assign(entry, { size: stat.size });
      }
      return Object.assign(entry, { size: 0 });
    }),
  );

  // Build sidebar if enabled
  let sidebar: NavItem[] = [];
  if (settings.navigation.sidebar.enabled) {
    sidebar = await buildSidebar(rootDir, urlPath, settings, false);
  }

  const dirName = urlPath
    ? path.basename(urlPath.replace(/\/+$/, "")) || urlPath
    : "";
  const html = renderPage({
    title: dirName ? humanizeFilename(dirName) : "Index",
    body: renderDirectory({ urlPath, entries: entriesWithSize }),
    filePath: urlPath,
    settings,
    urlPath,
    sidebar,
    isStaticExport: false,
  });

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

async function serveMarkdownOrMdx(
  res: ServerResponse,
  filePath: string,
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
    sidebar = await buildSidebar(rootDir, urlPath, settings, false);
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
    isStaticExport: false,
  });

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  filePath: string,
  ext: string,
): void {
  const contentType = MIME[ext] || "application/octet-stream";

  const stream = createReadStream(filePath);
  stream.on("error", () => {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  });

  res.writeHead(200, { "Content-Type": contentType });
  stream.pipe(res);
}

function sendError(
  res: ServerResponse,
  code: number,
  message: string,
  settings: Settings,
): void {
  const html = renderPage({
    title: `${code} — ${message}`,
    body: `<div style="text-align: center; padding: 50px;">
  <h1 style="font-size: 48px; margin-bottom: 20px;">${code}</h1>
  <p style="font-size: 18px; margin-bottom: 30px;">${message}</p>
  <a href="/" style="color: var(--accent);">← Back to home</a>
</div>`,
    filePath: "",
    settings,
    isStaticExport: false,
  });

  res.writeHead(code, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
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
  return filename
    .replace(/^\d+\./, "")
    .replace(/[-_]/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}
