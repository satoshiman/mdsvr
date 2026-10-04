import { IncomingMessage, ServerResponse } from "node:http";
import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import { renderPage } from "./template/index.js";
import { generateSitemap } from "./generators/sitemap.js";
import { generateFeed } from "./generators/feed.js";
import {
  renderPageService,
  renderDirectoryPage,
  isHidden,
  isBlocked,
  isAllowedExtension,
} from "./render-page.js";
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
  const resolvedRootPath = path.resolve(rootDir);
  const resolvedPath = path.resolve(path.join(resolvedRootPath, cleanUrlPath));
  if (!isPathWithinRoot(resolvedRootPath, resolvedPath)) {
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
    const realPath = await resolveContainedRealPath(
      resolvedRootPath,
      resolvedPath,
    );
    if (realPath === null) {
      sendError(res, 403, "Forbidden", settings);
      return;
    }

    const stat = await fs.stat(realPath);

    if (stat.isDirectory()) {
      const encodedPath = urlPath
        .split("/")
        .filter((segment) => segment.length > 0)
        .map(encodeURIComponent)
        .join("/");
      const canonicalPath = encodedPath ? `/${encodedPath}/` : "/";
      const queryIndex = url.indexOf("?");
      const requestPath = queryIndex === -1 ? url : url.slice(0, queryIndex);
      const rawQuery = queryIndex === -1 ? "" : url.slice(queryIndex);

      if (requestPath !== canonicalPath) {
        res.writeHead(308, { Location: `${canonicalPath}${rawQuery}` });
        res.end();
        return;
      }

      await serveDirectory(res, realPath, urlPath, rootDir, settings);
    } else if (ext === ".md" || (ext === ".mdx" && settings.mdx.enabled)) {
      await serveMarkdownOrMdx(res, realPath, urlPath, rootDir, settings);
    } else if (isAllowedExtension(ext, settings)) {
      await serveStatic(req, res, realPath, ext);
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
        const realMdPath = await resolveContainedRealPath(
          resolvedRootPath,
          mdPath,
        );
        if (realMdPath === null) {
          sendError(res, 403, "Forbidden", settings);
          return;
        }
        await serveMarkdownOrMdx(res, realMdPath, urlPath, rootDir, settings);
        return;
      } catch {
        // Try .mdx
        if (settings.mdx.enabled) {
          try {
            const realMdxPath = await resolveContainedRealPath(
              resolvedRootPath,
              mdxPath,
            );
            if (realMdxPath === null) {
              sendError(res, 403, "Forbidden", settings);
              return;
            }
            await serveMarkdownOrMdx(
              res,
              realMdxPath,
              urlPath,
              rootDir,
              settings,
            );
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

async function resolveContainedRealPath(
  rootPath: string,
  candidatePath: string,
): Promise<string | null> {
  const [realRootPath, realCandidatePath] = await Promise.all([
    fs.realpath(rootPath),
    fs.realpath(candidatePath),
  ]);
  return isPathWithinRoot(realRootPath, realCandidatePath)
    ? realCandidatePath
    : null;
}

function isPathWithinRoot(rootPath: string, candidatePath: string): boolean {
  const relativePath = path.relative(rootPath, candidatePath);
  return (
    relativePath !== ".." &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
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
      const realIndexPath = await resolveContainedRealPath(rootDir, indexPath);
      if (realIndexPath === null) {
        sendError(res, 403, "Forbidden", settings);
        return;
      }
      const ext = path.extname(indexFile).toLowerCase();
      if (ext === ".md" || (ext === ".mdx" && settings.mdx.enabled)) {
        await serveMarkdownOrMdx(
          res,
          realIndexPath,
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
    const realIndexHtml = await resolveContainedRealPath(rootDir, indexHtml);
    if (realIndexHtml === null) {
      sendError(res, 403, "Forbidden", settings);
      return;
    }
    await serveStatic(
      { method: "GET", url: urlPath } as IncomingMessage,
      res,
      realIndexHtml,
      ".html",
    );
    return;
  } catch {
    // Continue to directory listing
  }

  // Render directory listing through the shared page service
  const page = await renderDirectoryPage({
    listDir: dirPath,
    urlPath,
    rootDir,
    settings,
    mode: "dynamic",
  });

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(page.html);
}

async function serveMarkdownOrMdx(
  res: ServerResponse,
  filePath: string,
  urlPath: string,
  rootDir: string,
  settings: Settings,
): Promise<void> {
  const page = await renderPageService({
    sourcePath: filePath,
    urlPath,
    rootDir,
    settings,
    mode: "dynamic",
  });

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(page.html);
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
