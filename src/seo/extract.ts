/**
 * Content extraction helpers for SEO metadata.
 * (Moved from renderer/markdown.ts; description extraction is wired so it
 * actually runs, and tightened to ~160 chars.)
 */

function stripFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
}

function stripFencedCode(content: string): string {
  return content
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, "")
    .replace(/(`{3,}|~{3,})[\s\S]*?\1/g, "");
}

function decodeEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&#x27;": "'",
    "&nbsp;": " ",
  };
  return text.replace(
    /&(amp|lt|gt|quot|nbsp|#39|#x27);/g,
    (m) => entities[m] || m,
  );
}

/** Strip inline markdown/HTML so only plain text remains. */
function cleanInline(text: string): string {
  return decodeEntities(
    text
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images → alt text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
      .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1") // ref links → text
      .replace(/<[^>]+>/g, "") // HTML tags
      .replace(/(\*\*|__)(.*?)\1/g, "$2") // bold
      .replace(/\*([^*]+)\*/g, "$1") // italic
      // _italic_ — only at word boundaries so SNAKE_CASE identifiers survive
      .replace(/(^|\W)_([^_]+)_(?=\W|$)/g, "$1$2")
      .replace(/~~([^~]+)~~/g, "$1") // strikethrough
      .replace(/`([^`]+)`/g, "$1") // inline code
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/**
 * Whether a trimmed line can never begin a meaningful paragraph
 * (headings, lists, tables, blockquotes, HTML, MDX statements, nav links).
 */
function isSkippableLine(line: string): boolean {
  if (/^#{1,6}\s/.test(line)) return true; // heading
  if (/^>/.test(line)) return true; // blockquote
  if (/^[-*_]{3,}$/.test(line)) return true; // horizontal rule
  if (/^[-*+]\s/.test(line)) return true; // bullet list
  if (/^\d+\.\s/.test(line)) return true; // ordered list
  if (/^\|/.test(line)) return true; // table row
  const c = line[0];
  if (c === "`" || c === "~") return true; // fence remnants
  if (c === "<") return true; // HTML block/tag line
  if (c === "!") return true; // image
  if (c === "[") return true; // bare link / link reference (nav-like)
  if (c === ":" || c === "{" || c === "}" || c === "=") return true; // containers/MDX
  if (/^(import|export)\s/.test(line)) return true; // MDX statements
  if (/^\/\//.test(line)) return true; // JS-style comments
  return false;
}

/** Truncate on a word boundary near `soft`, never exceeding `hard`. */
function truncate(text: string, soft: number, hard: number): string {
  if (text.length <= soft) return text;
  const window = text.slice(0, soft);
  const boundary = window.lastIndexOf(" ");
  let out = boundary > 40 ? window.slice(0, boundary) : text.slice(0, hard - 3);
  if (out.length > hard - 3) out = out.slice(0, hard - 3);
  return `${out.trimEnd()}...`;
}

/**
 * Extract the first H1 heading from markdown content (for SEO title fallback).
 */
export function extractFirstHeading(content: string): string | null {
  const body = stripFencedCode(stripFrontmatter(content));
  const match = body.match(/^#[ \t]+(.+?)[ \t]*#*[ \t]*$/m);
  return match ? cleanInline(match[1]) || null : null;
}

/** Descriptions shorter than this are treated as degenerate — keep scanning. */
const MIN_DESCRIPTION_LENGTH = 40;

/**
 * Whether a line is a bare label like `**Làm gì:**` or `Functional:` —
 * markdown emphasis that cleans to a short colon-terminated string.
 */
function isLabelOnly(line: string): boolean {
  const text = cleanInline(line);
  return (
    text.length > 0 &&
    text.length <= MIN_DESCRIPTION_LENGTH &&
    text.endsWith(":")
  );
}

/**
 * Extract the first meaningful paragraph from markdown content
 * (for the meta description fallback). Skips frontmatter, code blocks,
 * headings, HTML, comments, and nav-like lines; drops label-only lines;
 * requires ~40 chars of real prose (shorter paragraphs are kept only as a
 * last resort); collapses whitespace; cuts at ~160 chars on a word
 * boundary (hard cap 200).
 */
export function extractFirstParagraph(content: string): string | null {
  let body = stripFrontmatter(content);
  body = stripFencedCode(body);
  body = body.replace(/<!--[\s\S]*?-->/g, "");

  let fallback: string | null = null;
  let paraLines: string[] = [];

  // Evaluate the accumulated paragraph: returns a qualifying description,
  // records a shorter candidate as fallback, or null if the block is empty.
  const flush = (): string | null => {
    if (paraLines.length === 0) return null;
    const kept = paraLines.filter((l) => !isLabelOnly(l));
    paraLines = [];
    const text = cleanInline(kept.join(" "));
    if (!text) return null;
    if (text.length >= MIN_DESCRIPTION_LENGTH) return truncate(text, 160, 200);
    if (!fallback || text.length > fallback.length) fallback = text;
    return null;
  };

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line || isSkippableLine(line)) {
      const result = flush();
      if (result) return result;
      continue;
    }
    paraLines.push(line);
  }

  const result = flush();
  return result ?? (fallback ? truncate(fallback, 160, 200) : null);
}

/**
 * Extract SEO data (title + description) from markdown content.
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
