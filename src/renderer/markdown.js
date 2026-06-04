import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import hljs from "highlight.js";
import matter from "gray-matter";
// Create markdown-it instance with settings
function createMarkdownIt(settings) {
    const md = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true,
        highlight: (str, lang) => {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(str, { language: lang }).value;
                }
                catch {
                    // Fall through to plain text
                }
            }
            return md.utils.escapeHtml(str);
        },
    });
    md.use(markdownItAnchor, {
        permalink: false,
        slugify: (s) => encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, "-")),
    });
    return md;
}
export function renderMarkdown(content, settings) {
    // Parse frontmatter
    const parsed = matter(content);
    const frontmatter = parsed.data;
    // Render markdown
    const md = createMarkdownIt(settings);
    const html = md.render(parsed.content);
    // Extract TOC from rendered HTML
    const toc = extractToc(html);
    return { html, frontmatter, toc };
}
function extractToc(html) {
    const toc = [];
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
export function renderMarkdownSimple(content) {
    const md = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true,
        highlight: (str, lang) => {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(str, { language: lang }).value;
                }
                catch {
                    // Fall through to plain text
                }
            }
            return md.utils.escapeHtml(str);
        },
    });
    md.use(markdownItAnchor, {
        permalink: false,
        slugify: (s) => encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, "-")),
    });
    return md.render(content);
}
