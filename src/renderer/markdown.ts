import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import hljs from "highlight.js";
import matter from "gray-matter";
import type { Settings } from "../settings/index.js";

export interface TocItem {
  level: number;
  text: string;
  slug: string;
  children?: TocItem[];
}

export interface MarkdownResult {
  html: string;
  frontmatter: Record<string, unknown>;
  toc: TocItem[];
}

// Create markdown-it instance with settings
function createMarkdownIt(settings: Settings): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: (str: string, lang: string): string => {
      // ADD: intercept mermaid blocks
      if (lang === "mermaid") {
        return `<div class="mermaid">${str.trim()}</div>`;
      }

      // existing hljs logic — KEEP AS IS
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre><code class="hljs language-${lang}">${
            hljs.highlight(str, { language: lang }).value
          }</code></pre>\n`;
        } catch {
          // Fall through to plain text
        }
      }
      return md.utils.escapeHtml(str);
    },
  });

  md.use(markdownItAnchor, {
    permalink: false,
    slugify: (s: string) =>
      encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, "-")),
  });

  return md;
}

export function renderMarkdown(
  content: string,
  settings: Settings,
): MarkdownResult {
  // Parse frontmatter
  const parsed = matter(content);
  const frontmatter = parsed.data as Record<string, unknown>;

  // Render markdown
  const md = createMarkdownIt(settings);
  const html = md.render(parsed.content);

  // Extract TOC from rendered HTML
  const toc = extractToc(html);

  return { html, frontmatter, toc };
}

function extractToc(html: string): TocItem[] {
  const toc: TocItem[] = [];
  // Match heading tags with id attributes
  const regex = /<h([1-6])[^>]*id="([^"]+)"[^>]*>([^<]*)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const slug = match[2];
    const text = match[3].replace(/<[^>]*>/g, ""); // strip any inline tags
    toc.push({ level, text, slug });
  }
  return toc;
}

// For V1 compatibility - simple render without frontmatter extraction
export function renderMarkdownSimple(content: string): string {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: (str: string, lang: string): string => {
      // ADD: intercept mermaid blocks
      if (lang === "mermaid") {
        return `<div class="mermaid">${str.trim()}</div>`;
      }

      // existing hljs logic — KEEP AS IS
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre><code class="hljs language-${lang}">${
            hljs.highlight(str, { language: lang }).value
          }</code></pre>\n`;
        } catch {
          // Fall through to plain text
        }
      }
      return md.utils.escapeHtml(str);
    },
  });

  md.use(markdownItAnchor, {
    permalink: false,
    slugify: (s: string) =>
      encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, "-")),
  });

  return md.render(content);
}
