import path from "node:path";
import { promises as fs } from "node:fs";
import type { Settings } from "../settings/index.js";
import { buildSiteUrl } from "../seo/url.js";

/**
 * Generate robots.txt content.
 *
 * A non-empty `robots.txt` in the docs root always wins. Otherwise emit a
 * permissive file; the `Sitemap:` line is only included when an absolute
 * sitemap URL can be derived (`site.baseUrl`, or the request `origin`
 * in serve mode) — relative Sitemap URLs are invalid per spec.
 */
export async function generateRobotsTxt(
  rootDir: string,
  settings: Settings,
  origin?: string,
): Promise<string> {
  const customRobotsPath = path.join(rootDir, "robots.txt");
  try {
    const customRobots = await fs.readFile(customRobotsPath, "utf-8");
    if (customRobots.trim().length > 0) {
      return customRobots;
    }
  } catch {
    // No custom robots.txt
  }

  const lines = ["User-agent: *", "Allow: /"];
  if (settings.seo.generateSitemap) {
    const siteUrl = buildSiteUrl(settings, origin);
    if (siteUrl) {
      lines.push(`Sitemap: ${siteUrl}sitemap.xml`);
    }
  }
  return `${lines.join("\n")}\n`;
}
