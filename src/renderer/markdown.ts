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
        const escaped = str.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<pre class="mermaid-wrapper"><div class="mermaid-container">
  <div class="mermaid-toolbar">
    <button class="mermaid-btn mermaid-btn-chart" title="Chart view"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/></svg></button>
    <button class="mermaid-btn mermaid-btn-fullscreen" title="Fullscreen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 15 6 6"/><path d="m15 9 6-6"/><path d="M21 16v5h-5"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/><path d="m3 21 6-6"/><path d="M3 8V3h5"/><path d="M9 9 3 3"/></svg></button>
    <button class="mermaid-btn mermaid-btn-code" title="Show code"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg></button>
  </div>
  <div class="mermaid-zoom-controls">
    <button class="mermaid-btn mermaid-btn-zoom-in" title="Zoom in"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
    <button class="mermaid-btn mermaid-btn-zoom-out" title="Zoom out"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
  </div>
  <div class="mermaid-chart">
    <div class="mermaid">${str.trim()}</div>
  </div>
  <pre class="mermaid-source"><code>${escaped}</code></pre>
</div></pre>\n`;
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

  // Wrap tables in a scrollable container for mobile responsiveness
  md.renderer.rules.table_open = () => '<div class="table-wrapper"><table>\n';
  md.renderer.rules.table_close = () => "</table></div>\n";

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

/**
 * Extract the first H1 heading from markdown content (for SEO title fallback)
 */
export function extractFirstHeading(content: string): string | null {
  // Match markdown H1 heading (# Heading text)
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  return null;
}

/**
 * Extract the first paragraph text from markdown content (for SEO description fallback)
 * Skips frontmatter, headings, code blocks, and HTML comments
 */
export function extractFirstParagraph(content: string): string | null {
  // Remove frontmatter
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---/, "");

  // Remove code blocks
  const withoutCodeBlocks = withoutFrontmatter.replace(/```[\s\S]*?```/g, "");

  // Remove HTML comments
  const withoutComments = withoutCodeBlocks.replace(/<!--[\s\S]*?-->/g, "");

  // Remove headings
  const withoutHeadings = withoutComments.replace(/^#{1,6}\s+.+$/gm, "");

  // Remove horizontal rules
  const withoutRules = withoutHeadings.replace(/^[\s]*[-_*]{3,}[\s]*$/gm, "");

  // Find first non-empty paragraph (text followed by blank line or end of string)
  // Match text that isn't a list item, blockquote, or other special markdown
  const paragraphRegex = /^([^\s#\-\*\>\|\!\`].+)$/m;
  const match = withoutRules.match(paragraphRegex);

  if (match) {
    // Clean up the text: remove markdown formatting and trim
    let text = match[1]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links, keep text
      .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
      .replace(/\*([^*]+)\*/g, "$1") // Remove italic
      .replace(/`([^`]+)`/g, "$1") // Remove inline code
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    // Limit to reasonable length for description
    if (text.length > 300) {
      text = text.slice(0, 297).trim() + "...";
    }

    return text || null;
  }

  return null;
}

/**
 * Extract SEO data from markdown content
 */
export function extractSeoData(content: string): {
  title: string | null;
  description: string | null;
} {
  return {
    title: extractFirstHeading(content),
    description: extractFirstParagraph(content),
  };
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
        const escaped = str.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<pre class="mermaid-wrapper"><div class="mermaid-container">
  <div class="mermaid-toolbar">
    <button class="mermaid-btn mermaid-btn-chart" title="Chart view"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/></svg></button>
    <button class="mermaid-btn mermaid-btn-fullscreen" title="Fullscreen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 15 6 6"/><path d="m15 9 6-6"/><path d="M21 16v5h-5"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/><path d="m3 21 6-6"/><path d="M3 8V3h5"/><path d="M9 9 3 3"/></svg></button>
    <button class="mermaid-btn mermaid-btn-code" title="Show code"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg></button>
  </div>
  <div class="mermaid-zoom-controls">
    <button class="mermaid-btn mermaid-btn-zoom-in" title="Zoom in"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
    <button class="mermaid-btn mermaid-btn-zoom-out" title="Zoom out"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
  </div>
  <div class="mermaid-chart">
    <div class="mermaid">${str.trim()}</div>
  </div>
  <pre class="mermaid-source"><code>${escaped}</code></pre>
</div></pre>\n`;
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

  md.renderer.rules.table_open = () => '<div class="table-wrapper"><table>\n';
  md.renderer.rules.table_close = () => "</table></div>\n";

  return md.render(content);
}
