function isExternalOrSpecial(url: string): boolean {
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("//")
  ) {
    return true;
  }
  // Skip mailto, tel, and other protocols (but keep #anchors)
  return /^[a-z]+:/i.test(url) && !url.startsWith("#");
}

function stripMarkdownExt(url: string): string {
  return url.replace(/\.(md|mdx)(#|$)/i, (_m, _ext, suffix: string) =>
    suffix === "#" ? "#" : "",
  );
}

/**
 * Convert .md/.mdx links to clean URLs.
 * Source content uses GitHub-compatible .md/.mdx links; this rewrites them
 * for outputs where clean URLs are canonical (static export, cleanUrls serve).
 *
 * Works on rendered HTML (href attributes) as well as raw markdown
 * [text](url) syntax.
 */
export function convertMarkdownLinks(html: string): string {
  // Rewrite HTML href attributes pointing at .md/.mdx files
  let result = html.replace(/href="([^"]+)"/g, (match, url: string) =>
    isExternalOrSpecial(url) ? match : `href="${stripMarkdownExt(url)}"`,
  );

  // Match markdown links: [text](path) and [text](path#anchor)
  // Also match image links: ![text](path) - but we skip those
  result = result.replace(
    /(?<!\!)\[([^\]]+)\]\(([^)]+)\)/g,
    (match, text, url: string) =>
      isExternalOrSpecial(url) ? match : `[${text}](${stripMarkdownExt(url)})`,
  );

  return result;
}
