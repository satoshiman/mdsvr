import { IncomingMessage, ServerResponse } from "node:http";
import { promises as fs, createReadStream, type Dirent } from "node:fs";
import path from "node:path";
import { renderMarkdown } from "./renderer.js";
import { wrapHtml } from "./template.js";
import { renderDirectory } from "./directory.js";

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
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".xml": "application/xml",
  ".zip": "application/zip",
};

export async function route(
  req: IncomingMessage,
  res: ServerResponse,
  rootDir: string,
): Promise<void> {
  // Only handle GET and HEAD
  if (req.method && !["GET", "HEAD"].includes(req.method)) {
    sendError(res, 405, "Method Not Allowed");
    return;
  }

  const url = req.url || "/";
  const urlPath = decodeURIComponent(url.split("?")[0]);

  // Resolve path and check for path traversal
  // Remove leading slash from urlPath to ensure proper relative resolution
  const cleanUrlPath = urlPath.replace(/^\/+/, "");
  const resolvedPath = path.resolve(path.join(rootDir, cleanUrlPath));
  if (!resolvedPath.startsWith(rootDir)) {
    sendError(res, 403, "Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(resolvedPath);

    if (stat.isDirectory()) {
      await serveDirectory(res, resolvedPath, urlPath, rootDir);
    } else if (urlPath.endsWith(".md")) {
      await serveMarkdown(res, resolvedPath, urlPath);
    } else {
      await serveStatic(req, res, resolvedPath);
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      sendError(res, 404, "Not Found");
    } else {
      sendError(res, 500, "Internal Server Error");
    }
  }
}

async function serveDirectory(
  res: ServerResponse,
  dirPath: string,
  urlPath: string,
  rootDir: string,
): Promise<void> {
  // Try to find index.md or index.html
  const indexMd = path.join(dirPath, "index.md");
  const indexHtml = path.join(dirPath, "index.html");

  try {
    await fs.access(indexMd);
    await serveMarkdown(res, indexMd, path.join(urlPath, "index.md"));
    return;
  } catch {
    // Continue to check index.html
  }

  try {
    await fs.access(indexHtml);
    await serveStatic(
      { method: "GET", url: urlPath } as IncomingMessage,
      res,
      indexHtml,
    );
    return;
  } catch {
    // Continue to directory listing
  }

  // Read directory contents
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  // Add size information to entries
  const entriesWithSize = await Promise.all(
    entries.map(async (entry: Dirent & { size?: number }) => {
      if (entry.isFile()) {
        const fullPath = path.join(dirPath, entry.name);
        const stat = await fs.stat(fullPath);
        return Object.assign(entry, { size: stat.size });
      }
      return Object.assign(entry, { size: 0 });
    }),
  );

  const html = renderDirectory({
    urlPath,
    entries: entriesWithSize,
  });

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

async function serveMarkdown(
  res: ServerResponse,
  filePath: string,
  urlPath: string,
): Promise<void> {
  const content = await fs.readFile(filePath, "utf-8");
  const rendered = renderMarkdown(content);
  const title = path.basename(filePath, ".md");

  const html = wrapHtml({
    title,
    body: rendered,
    filePath: urlPath,
  });

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  filePath: string,
): void {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";

  const stream = createReadStream(filePath);
  stream.on("error", () => {
    sendError(res, 500, "Internal Server Error");
  });

  res.writeHead(200, { "Content-Type": contentType });
  stream.pipe(res);
}

function sendError(res: ServerResponse, code: number, message: string): void {
  const html = `<!DOCTYPE html>
<html>
<head><title>${code} — ${message}</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 50px;">
  <h1>${code}</h1>
  <p>${message}</p>
  <a href="/">← Back to home</a>
</body>
</html>`;

  res.writeHead(code, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}
