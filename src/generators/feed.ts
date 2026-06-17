import path from "node:path";
import { promises as fs } from "node:fs";
import matter from "gray-matter";
import type { Settings } from "../settings/index.js";

interface FeedEntry {
  title: string;
  url: string;
  date: Date;
  description?: string;
  content?: string;
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

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

async function readDirRecursive(
  dirPath: string,
  rootDir: string,
  baseUrl: string,
  settings: Settings,
): Promise<FeedEntry[]> {
  const entries: FeedEntry[] = [];
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
        const content = await fs.readFile(fullPath, "utf-8");
        const parsed = matter(content);

        // Only include files with a date in frontmatter (treat as blog posts)
        if (!parsed.data.date) continue;

        const date = new Date(parsed.data.date as string);
        if (isNaN(date.getTime())) continue;

        const relativePath =
          "/" + path.relative(rootDir, fullPath).replace(/\\/g, "/");
        const urlPath = relativePath.replace(/\.(md|mdx)$/, "");
        const fullUrl = `${baseUrl.replace(/\/$/, "")}${urlPath}`;

        const title =
          (parsed.data.title as string) ||
          parsed.content.match(/^#\s+(.+)$/m)?.[1] ||
          item.name.replace(/\.\w+$/, "");

        entries.push({
          title,
          url: fullUrl,
          date,
          description: (parsed.data.description as string) || "",
          content: stripHtml(parsed.content.slice(0, 500)),
        });
      } catch {
        // Skip files that can't be read
      }
    }
  }

  return entries;
}

export async function generateFeed(
  rootDir: string,
  settings: Settings,
): Promise<string> {
  const baseUrl = settings.site.baseUrl || "http://localhost:1800";
  const basePath = settings.generate.basePath || "";
  const feedUrl = settings.seo.rss?.feedUrl || "/feed.xml";
  const siteUrl = settings.seo.rss?.siteUrl || baseUrl + basePath;
  const fullBaseUrl = baseUrl.replace(/\/$/, "") + basePath;

  const entries = await readDirRecursive(
    rootDir,
    rootDir,
    fullBaseUrl,
    settings,
  );

  // Sort by date, newest first
  entries.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Take most recent 20
  const recentEntries = entries.slice(0, 20);

  const rssTitle = settings.seo.rss?.title || settings.site.title;
  const rssDescription = settings.site.description || "RSS Feed";
  const lastBuildDate = new Date().toUTCString();

  const itemElements = recentEntries
    .map(
      (entry) => `    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${escapeXml(entry.url)}</link>
      <pubDate>${entry.date.toUTCString()}</pubDate>
      <guid>${escapeXml(entry.url)}</guid>
      ${entry.description ? `<description>${escapeXml(entry.description)}</description>` : ""}
    </item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(rssTitle)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(rssDescription)}</description>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(baseUrl + feedUrl)}" rel="self" type="application/rss+xml" />
${itemElements}
  </channel>
</rss>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
