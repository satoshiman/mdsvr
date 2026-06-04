import path from "node:path";
import { promises as fs } from "node:fs";
import matter from "gray-matter";
import type { Settings } from "../settings/index.js";

interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: string;
}

function isHidden(filePath: string, settings: Settings): boolean {
  const basename = path.basename(filePath);

  for (const pattern of settings.files.extensions.hidden) {
    if (basename === pattern) return true;
    if (pattern.startsWith("*") && basename.endsWith(pattern.slice(1)))
      return true;
  }

  if (basename.startsWith("_")) return true;

  return false;
}

async function readDirRecursive(
  dirPath: string,
  rootDir: string,
  baseUrl: string,
  settings: Settings,
): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];
  const items = await fs.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);

    if (isHidden(fullPath, settings)) continue;

    if (item.isDirectory()) {
      const subEntries = await readDirRecursive(
        fullPath,
        rootDir,
        baseUrl,
        settings,
      );
      entries.push(...subEntries);
    } else if (
      item.name.endsWith(".md") ||
      (item.name.endsWith(".mdx") && settings.mdx.enabled)
    ) {
      try {
        const relativePath =
          "/" + path.relative(rootDir, fullPath).replace(/\\/g, "/");
        const urlPath = relativePath.replace(/\.(md|mdx)$/, "");
        const fullUrl = `${baseUrl.replace(/\/$/, "")}${urlPath}`;

        // Try to get lastmod from frontmatter or file stat
        let lastmod: string | undefined;
        try {
          const content = await fs.readFile(fullPath, "utf-8");
          const parsed = matter(content);
          if (parsed.data.date) {
            const date = new Date(parsed.data.date as string);
            if (!isNaN(date.getTime())) {
              lastmod = date.toISOString().split("T")[0];
            }
          }
        } catch {
          // Fall through to file stat
        }

        if (!lastmod) {
          const stat = await fs.stat(fullPath);
          lastmod = stat.mtime.toISOString().split("T")[0];
        }

        entries.push({
          url: fullUrl,
          lastmod,
          changefreq: "weekly",
        });
      } catch {
        // Skip files that can't be read
      }
    }
  }

  return entries;
}

export async function generateSitemap(
  rootDir: string,
  settings: Settings,
): Promise<string> {
  const baseUrl = settings.site.baseUrl || "http://localhost:1900";

  const entries = await readDirRecursive(rootDir, rootDir, baseUrl, settings);

  // Sort by URL for consistent output
  entries.sort((a, b) => a.url.localeCompare(b.url));

  const urlElements = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
