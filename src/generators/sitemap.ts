import path from "node:path";
import { promises as fs } from "node:fs";
import matter from "gray-matter";
import type { Settings } from "../settings/index.js";
import { buildPageUrl } from "../seo/url.js";

export interface SitemapPage {
  urlPath: string;
  lastmod?: string;
  noIndex?: boolean;
}

interface SitemapEntry {
  loc: string;
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

  if (basename.startsWith("_") || basename.startsWith(".")) return true;

  return false;
}

function toIsoDate(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().split("T")[0];
}

/**
 * Build sorted, deduped sitemap entries from page records. `noindex` pages
 * are excluded and URLs are normalized + absolute. Returns `null` when no
 * absolute base (`site.baseUrl` or `origin`) is available — a sitemap
 * requires absolute URLs.
 */
function buildEntries(
  pages: SitemapPage[],
  settings: Settings,
  origin?: string,
): SitemapEntry[] | null {
  if (!settings.site.baseUrl && !origin) return null;

  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];

  for (const page of pages) {
    if (page.noIndex || settings.seo.noIndex) continue;
    const loc = buildPageUrl(page.urlPath, settings, origin);
    if (!loc || seen.has(loc)) continue;
    seen.add(loc);
    entries.push({ loc, lastmod: page.lastmod, changefreq: "weekly" });
  }

  entries.sort((a, b) => a.loc.localeCompare(b.loc));
  return entries;
}

function renderXml(entries: SitemapEntry[]): string {
  const urlElements = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ""}
    <changefreq>${entry.changefreq}</changefreq>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

/**
 * Sitemap for the static-export path: consumes the same page list the
 * exporter wrote, so output and sitemap always agree (including
 * auto-index directory pages). Returns `null` without `site.baseUrl`.
 */
export function generateSitemapFromPages(
  pages: SitemapPage[],
  settings: Settings,
  origin?: string,
): string | null {
  const entries = buildEntries(pages, settings, origin);
  return entries ? renderXml(entries) : null;
}

/**
 * Scan-based sitemap used by the dev server. `origin` is the request
 * origin (`http://host:port`); `site.baseUrl` wins when configured.
 * Returns `null` when no absolute base is available.
 */
export async function generateSitemap(
  rootDir: string,
  settings: Settings,
  origin?: string,
): Promise<string | null> {
  const pages: SitemapPage[] = [];
  await scanDirectory(rootDir, rootDir, settings, pages);
  const entries = buildEntries(pages, settings, origin);
  return entries ? renderXml(entries) : null;
}

async function scanDirectory(
  dirPath: string,
  rootDir: string,
  settings: Settings,
  pages: SitemapPage[],
): Promise<void> {
  const items = await fs.readdir(dirPath, { withFileTypes: true });
  const subDirs: string[] = [];
  let hasIndexFile = false;

  const indexBaseNames = settings.files.indexFiles.map((name) =>
    name.replace(/\.\w+$/, "").toLowerCase(),
  );

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    if (isHidden(fullPath, settings)) continue;

    if (item.isDirectory()) {
      subDirs.push(fullPath);
      continue;
    }

    if (
      !item.name.endsWith(".md") &&
      !(item.name.endsWith(".mdx") && settings.mdx.enabled)
    ) {
      continue;
    }

    try {
      const baseName = item.name.replace(/\.(md|mdx)$/i, "").toLowerCase();
      const relDir = path.relative(rootDir, dirPath).replace(/\\/g, "/");
      const dirUrl = relDir ? `/${relDir}/` : "/";
      const urlPath = indexBaseNames.includes(baseName)
        ? dirUrl
        : `${dirUrl}${item.name.replace(/\.(md|mdx)$/i, "")}`;

      if (indexBaseNames.includes(baseName)) hasIndexFile = true;

      let lastmod: string | undefined;
      let noIndex = false;
      try {
        const content = await fs.readFile(fullPath, "utf-8");
        const parsed = matter(content);
        lastmod = toIsoDate(parsed.data.dateModified ?? parsed.data.date);
        noIndex = (parsed.data.noindex ?? parsed.data.noIndex) === true;
      } catch {
        // Fall through to file stat
      }

      if (!lastmod) {
        const stat = await fs.stat(fullPath);
        lastmod = stat.mtime.toISOString().split("T")[0];
      }

      pages.push({ urlPath, lastmod, noIndex });
    } catch {
      // Skip files that can't be read
    }
  }

  // Auto-index directory page (directory without an index file)
  if (!hasIndexFile) {
    try {
      const relDir = path.relative(rootDir, dirPath).replace(/\\/g, "/");
      const urlPath = relDir ? `/${relDir}/` : "/";
      const stat = await fs.stat(dirPath);
      pages.push({
        urlPath,
        lastmod: stat.mtime.toISOString().split("T")[0],
      });
    } catch {
      // Skip directories that can't be stat'ed
    }
  }

  for (const subDir of subDirs) {
    await scanDirectory(subDir, rootDir, settings, pages);
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
