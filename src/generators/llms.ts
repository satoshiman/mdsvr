import path from "node:path";
import { promises as fs } from "node:fs";
import matter from "gray-matter";
import type { Settings } from "../settings/index.js";
import { isHidden } from "../render-page.js";
import {
  extractFirstHeading,
  extractFirstParagraph,
} from "../seo/extract.js";
import { buildSiteUrl } from "../seo/url.js";

/**
 * llms.txt generators (https://llmstxt.org).
 *
 * `/llms.txt` is a curated Markdown index of the site's pages for LLM
 * consumers; `/llms-full.txt` concatenates the full Markdown source of every
 * page. Non-empty `llms.txt`/`llms-full.txt` files in the docs root always
 * win (same convention as `robots.txt`). `noindex` pages are excluded.
 */

interface LlmsPage {
  title: string;
  urlPath: string;
  description?: string;
  /** Markdown source without frontmatter. */
  content: string;
}

function humanizeSegment(segment: string): string {
  return segment
    .replace(/^\d+\./, "")
    .replace(/[-_]/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

async function collectPages(
  dirPath: string,
  rootDir: string,
  settings: Settings,
): Promise<LlmsPage[]> {
  const pages: LlmsPage[] = [];
  const items = (await fs.readdir(dirPath, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  );

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    if (isHidden(item.name, settings)) continue;

    if (item.isDirectory()) {
      pages.push(...(await collectPages(fullPath, rootDir, settings)));
    } else if (
      item.name.endsWith(".md") ||
      (item.name.endsWith(".mdx") && settings.mdx.enabled)
    ) {
      try {
        const raw = await fs.readFile(fullPath, "utf-8");
        const parsed = matter(raw);
        const frontmatter = parsed.data as Record<string, unknown>;

        if ((frontmatter.noindex ?? frontmatter.noIndex) === true) continue;

        const relativePath =
          "/" + path.relative(rootDir, fullPath).replace(/\\/g, "/");
        let urlPath = relativePath.replace(/\.(md|mdx)$/, "");
        // Index files render at the directory URL; other docs are
        // trailing-slash routes — both canonical clean-URL forms.
        if (/^(readme|index)$/i.test(path.basename(urlPath))) {
          urlPath = path.dirname(urlPath);
        }
        if (!urlPath.endsWith("/")) urlPath += "/";

        const title =
          (typeof frontmatter.title === "string" && frontmatter.title) ||
          extractFirstHeading(parsed.content) ||
          item.name.replace(/\.\w+$/, "");

        const description =
          (typeof frontmatter.description === "string" &&
            frontmatter.description) ||
          extractFirstParagraph(parsed.content) ||
          undefined;

        pages.push({
          title,
          urlPath,
          description,
          content: parsed.content.trim(),
        });
      } catch {
        // Skip files that can't be read
      }
    }
  }

  return pages;
}

function pageUrl(urlPath: string, siteUrl: string | null): string {
  return siteUrl ? `${siteUrl.replace(/\/+$/, "")}${urlPath}` : urlPath;
}

async function readCustomFile(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content.trim().length > 0 ? content : null;
  } catch {
    return null;
  }
}

/**
 * Build `/llms.txt`: H1 site title, a blockquote summary, then link lists
 * grouped by top-level section. Links are absolute when `site.baseUrl`
 * (or the request `origin` in serve mode) is available, root-relative
 * otherwise.
 */
export async function generateLlmsTxt(
  rootDir: string,
  settings: Settings,
  origin?: string,
): Promise<string> {
  const custom = await readCustomFile(path.join(rootDir, "llms.txt"));
  if (custom) return custom;

  const pages = await collectPages(rootDir, rootDir, settings);
  const siteUrl = buildSiteUrl(settings, origin);

  const lines: string[] = [`# ${settings.site.title || "Documentation"}`, ""];
  if (settings.site.description) {
    lines.push(`> ${settings.site.description}`, "");
  }

  // Group by top-level section; root pages first under "Docs".
  const groups = new Map<string, LlmsPage[]>();
  for (const page of pages) {
    const section = page.urlPath.split("/").filter(Boolean)[0] ?? "";
    const group = groups.get(section);
    if (group) group.push(page);
    else groups.set(section, [page]);
  }

  const sectionNames = [...groups.keys()].sort((a, b) => {
    if (a === "") return -1;
    if (b === "") return 1;
    return a.localeCompare(b);
  });

  for (const section of sectionNames) {
    const heading = section ? humanizeSegment(section) : "Docs";
    lines.push(`## ${heading}`, "");
    for (const page of groups.get(section)!) {
      const suffix = page.description ? `: ${page.description}` : "";
      lines.push(`- [${page.title}](${pageUrl(page.urlPath, siteUrl)})${suffix}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

/**
 * Build `/llms-full.txt`: the full Markdown source of every page, each
 * preceded by its title and canonical URL so chunks remain attributable.
 */
export async function generateLlmsFullTxt(
  rootDir: string,
  settings: Settings,
  origin?: string,
): Promise<string> {
  const custom = await readCustomFile(path.join(rootDir, "llms-full.txt"));
  if (custom) return custom;

  const pages = await collectPages(rootDir, rootDir, settings);
  const siteUrl = buildSiteUrl(settings, origin);

  const parts: string[] = [
    `# ${settings.site.title || "Documentation"}`,
  ];
  if (settings.site.description) {
    parts.push("", settings.site.description);
  }

  for (const page of pages) {
    parts.push(
      "",
      "---",
      "",
      `# ${page.title}`,
      "",
      `Source: ${pageUrl(page.urlPath, siteUrl)}`,
      "",
      page.content,
    );
  }

  return `${parts.join("\n").trimEnd()}\n`;
}
