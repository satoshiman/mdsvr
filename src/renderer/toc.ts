/**
 * Shared "On this page" TOC extraction from rendered HTML.
 *
 * Heading markup differs between pipelines: markdown-it emits plain inline
 * HTML while the MDX pipeline wraps heading text in an autolink anchor, and
 * inline math emits nested KaTeX spans. Extracting with a tag-free regex
 * drops any heading containing markup, so this walks the inner HTML with a
 * balanced-span scan instead.
 */
export interface TocItem {
  level: number;
  text: string;
  slug: string;
  children?: TocItem[];
}

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&nbsp;": " ",
};

function decodeEntities(text: string): string {
  return text.replace(
    /&(?:amp|lt|gt|quot|nbsp|#39|#x27);/g,
    (entity) => ENTITY_MAP[entity] ?? entity,
  );
}

/**
 * Replace every root `<span class="katex">…</span>` with the TeX source from
 * its `<annotation>` element. KaTeX emits the expression three times
 * (MathML, annotation, and the visual katex-html span), so keeping all text
 * would duplicate it. The root span is located via depth counting because
 * the inner markup nests arbitrarily.
 */
function replaceKatex(inner: string): string {
  const rootRe = /<span class="katex">/g;
  const tagRe = /<span\b[^>]*>|<\/span>/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = rootRe.exec(inner)) !== null) {
    out += inner.slice(last, m.index);
    tagRe.lastIndex = m.index + m[0].length;
    let depth = 1;
    let end = -1;
    let tag: RegExpExecArray | null;
    while ((tag = tagRe.exec(inner)) !== null) {
      depth += tag[0] === "</span>" ? -1 : 1;
      if (depth === 0) {
        end = tag.index + tag[0].length;
        break;
      }
    }
    if (end === -1) {
      // Unbalanced markup — keep the raw text and continue.
      out += m[0];
      last = m.index + m[0].length;
      continue;
    }
    const block = inner.slice(m.index, end);
    const annotation = /<annotation[^>]*>([\s\S]*?)<\/annotation>/.exec(block);
    out += annotation ? annotation[1] : "";
    last = end;
    rootRe.lastIndex = end;
  }
  out += inner.slice(last);
  return out;
}

/** Plain-text form of a heading's inner HTML, suitable for TOC labels. */
function headingText(inner: string): string {
  let text = replaceKatex(inner);
  // Drop aria-hidden anchors injected by rehype-autolink-headings (MDX).
  text = text.replace(/<a\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/a>/g, "");
  text = text.replace(/<[^>]+>/g, "");
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

/**
 * Extract TOC entries from rendered page HTML. The content group is
 * `[\s\S]*?` (not `[^<]*`) so headings containing inline markup — math,
 * code, emphasis, autolink anchors — are captured like plain-text ones.
 */
export function extractToc(html: string): TocItem[] {
  const toc: TocItem[] = [];
  const regex = /<h([1-6])[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const slug = match[2];
    toc.push({ level, text: headingText(match[3]), slug });
  }
  return toc;
}
