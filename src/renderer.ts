import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import hljs from "highlight.js";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str: string, lang: string): string => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
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
    encodeURIComponent(
      String(s)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-"),
    ),
});

export function renderMarkdown(content: string): string {
  return md.render(content);
}
