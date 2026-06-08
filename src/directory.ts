import type { Dirent } from "node:fs";

export function renderDirectory(params: {
  urlPath: string;
  entries: Dirent[];
}): string {
  const { urlPath, entries } = params;

  // Sort: folders first, then files (alphabetically)
  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  const rows = sorted
    .map((entry) => {
      const name = entry.name;
      const isDir = entry.isDirectory();
      const icon = isDir ? "📁" : name.endsWith(".md") ? "📄" : "📃";
      const href =
        (urlPath ? urlPath.replace(/\/+$/, "") + "/" : "") +
        encodeURIComponent(name) +
        (isDir ? "/" : "");
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

  const breadcrumb = generateBreadcrumb(urlPath);

  // Theme script for dark mode support
  const themeScript = `
<script>
(function() {
  var theme = localStorage.getItem('theme') || 'system';
  if (theme === 'system') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
</script>`;

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Index of ${escapeHtml(urlPath)}</title>
  ${themeScript}
  <style>
    :root {
      --bg: #f6f8fa;
      --bg-secondary: #ffffff;
      --text: #24292f;
      --text-muted: #656d76;
      --border: #d0d7de;
      --accent: #0969da;
      --header-bg: #0d1117;
      --header-text: #f0f6fc;
      --header-border: #30363d;
    }
    :root[data-theme="dark"] {
      --bg: #0d1117;
      --bg-secondary: #161b22;
      --text: #e6edf3;
      --text-muted: #8d96a0;
      --border: #30363d;
      --accent: #58a6ff;
      --header-bg: #161b22;
      --header-text: #e6edf3;
      --header-border: #30363d;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: var(--text);
      background: var(--bg);
    }
    .header {
      background: var(--header-bg);
      padding: 16px 24px;
      border-bottom: 1px solid var(--header-border);
    }
    .header-logo {
      color: var(--header-text);
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
    }
    .container {
      max-width: 860px;
      margin: 32px auto;
      padding: 32px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 6px;
    }
    h1 { font-size: 20px; font-weight: 600; margin: 0 0 16px; color: var(--text); }
    .breadcrumb { font-size: 14px; color: var(--text-muted); margin-bottom: 20px; }
    .breadcrumb a { color: var(--accent); text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border); }
    th { font-weight: 600; color: var(--text-muted); font-size: 14px; }
    td { font-size: 14px; }
    td a { color: var(--accent); text-decoration: none; }
    td a:hover { text-decoration: underline; }
    .size { color: var(--text-muted); text-align: right; width: 100px; }
    .empty { color: var(--text-muted); font-style: italic; padding: 24px 0; }
    @media (max-width: 900px) {
      .container { margin: 16px; padding: 20px; }
      .header { padding: 12px 16px; }
    }
    @media (max-width: 480px) {
      .container { margin: 8px; padding: 16px; }
    }
  </style>
</head>
<body>
    <table>
      <thead>
        <tr><th>Name</th><th class="size">Size</th></tr>
      </thead>
      <tbody>
${
  urlPath
    ? `      <tr>
        <td>📁 <a href="../">../</a></td>
        <td class="size">-</td>
      </tr>`
    : ""
}
${rows || '      <tr><td colspan="2" class="empty">Empty directory</td></tr>'}
      </tbody>
    </table>
</body>
</html>`;
}

function generateBreadcrumb(urlPath: string): string {
  if (!urlPath || urlPath === "/") {
    return "<strong>home</strong>";
  }

  const parts = urlPath.split("/").filter(Boolean);
  let accum = "";

  const links = parts.map((part, i) => {
    accum += "/" + part;
    const isLast = i === parts.length - 1;
    if (isLast) {
      return `<strong>${escapeHtml(part)}</strong>`;
    }
    return `<a href="${accum}/">${escapeHtml(part)}</a>`;
  });

  return '<a href="/">home</a> / ' + links.join(" / ");
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
