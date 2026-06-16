import path from "node:path";
import { promises as fs } from "node:fs";
import matter from "gray-matter";
import type { Settings } from "../settings/index.js";

export interface SearchEntry {
  title: string;
  href: string;
  excerpt: string;
  headings: string[];
  content: string;
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

function stripMarkdown(content: string): string {
  return content
    .replace(/---[\s\S]*?---/, "") // Remove frontmatter
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .replace(/`([^`]+)`/g, "$1") // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links but keep text
    .replace(/[#*_~]/g, "") // Remove formatting chars
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

function extractHeadings(content: string): string[] {
  const headings: string[] = [];
  const regex = /^#{1,6}\s+(.+)$/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    headings.push(match[1].trim());
  }
  return headings;
}

async function readDirRecursive(
  dirPath: string,
  rootDir: string,
  settings: Settings,
): Promise<SearchEntry[]> {
  const entries: SearchEntry[] = [];
  const items = await fs.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);

    if (isHidden(fullPath, settings)) continue;

    if (item.isDirectory()) {
      const subEntries = await readDirRecursive(fullPath, rootDir, settings);
      entries.push(...subEntries);
    } else if (
      item.name.endsWith(".md") ||
      (item.name.endsWith(".mdx") && settings.mdx.enabled)
    ) {
      try {
        const content = await fs.readFile(fullPath, "utf-8");
        const parsed = matter(content);
        const relativePath =
          "/" + path.relative(rootDir, fullPath).replace(/\\/g, "/");
        let href = relativePath.replace(/\.(md|mdx)$/, "");
        // README becomes directory index, so link to the directory path
        if (path.basename(href).toLowerCase() === "readme") {
          href = path.dirname(href);
          if (!href.endsWith("/")) href += "/";
        }

        const title =
          (parsed.data.title as string) ||
          parsed.content.match(/^#\s+(.+)$/m)?.[1] ||
          item.name.replace(/\.\w+$/, "");

        const plainContent = stripMarkdown(parsed.content);
        const headings = extractHeadings(parsed.content);

        entries.push({
          title,
          href,
          excerpt: plainContent.slice(0, 200),
          headings,
          content: plainContent,
        });
      } catch {
        // Skip files that can't be read
      }
    }
  }

  return entries;
}

export async function buildSearchIndex(
  rootDir: string,
  settings: Settings,
): Promise<SearchEntry[]> {
  if (!settings.search.enabled) {
    return [];
  }

  return readDirRecursive(rootDir, rootDir, settings);
}
