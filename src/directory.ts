import type { Dirent } from "node:fs";

/**
 * Render a directory listing as a body fragment for auto-index pages.
 * The surrounding document (head, navigation, styles) comes from the page
 * template — this returns only `<h1>` + the listing table.
 *
 * File links use the canonical clean-URL form: `.md`/`.mdx` entries point to
 * the trailing-slash doc route; index files (README/index) are hidden because
 * they are the page itself.
 */
export function renderDirectory(params: {
  urlPath: string;
  entries: Dirent[];
  /** Heading text; defaults to a humanized form of the last URL segment. */
  title?: string;
}): string {
  const { urlPath, entries } = params;
  const lastSegment = urlPath.replace(/\/+$/, "").split("/").pop() || "";
  const title =
    params.title ??
    (lastSegment
      ? decodeURIComponent(lastSegment).replace(/[-_]/g, " ")
      : "Index");

  // Sort: folders first, then files (alphabetically)
  const sorted = [...entries]
    .filter((entry) => !isIndexEntry(entry.name))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  const base = urlPath.replace(/\/+$/, "") + "/";

  const rows = sorted
    .map((entry) => {
      const name = entry.name;
      const isDir = entry.isDirectory();
      const isDoc = /\.(md|mdx)$/i.test(name);
      const icon = isDir ? "📁" : isDoc ? "📄" : "📃";
      const href =
        isDir || isDoc
          ? `${base}${encodeURIComponent(name.replace(/\.(md|mdx)$/i, ""))}/`
          : `${base}${encodeURIComponent(name)}`;
      const size =
        !isDir && entry.isFile()
          ? formatSize((entry as unknown as { size: number }).size || 0)
          : "-";

      return `      <tr>
        <td>${icon} <a href="${href}">${escapeHtml(name)}${isDir ? "/" : ""}</a></td>
        <td class="size">${size}</td>
      </tr>`;
    })
    .join("\n");

  const hasParent = urlPath !== "" && urlPath !== "/";

  return `<h1>${escapeHtml(title)}</h1>
<nav class="dir-listing" aria-label="Directory listing">
    <table>
      <thead>
        <tr><th>Name</th><th class="size">Size</th></tr>
      </thead>
      <tbody>
${
  hasParent
    ? `      <tr>
        <td>📁 <a href="../">../</a></td>
        <td class="size">-</td>
      </tr>`
    : ""
}
${rows || '      <tr><td colspan="2" class="empty">Empty directory</td></tr>'}
      </tbody>
    </table>
</nav>`;
}

/** Index files render as the directory page itself — hide them in listings. */
function isIndexEntry(name: string): boolean {
  return /^(readme|index)\.(md|mdx|html?)$/i.test(name);
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${size} ${units[i]}`;
}

function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}
