export function wrapHtml(params: {
  title: string;
  body: string;
  filePath: string;
}): string {
  const { title, body, filePath } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #24292f;
      background: #f6f8fa;
    }
    .header {
      background: #0d1117;
      padding: 16px 24px;
      border-bottom: 1px solid #30363d;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-logo {
      color: #f0f6fc;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
    }
    .header-filename {
      color: #f0f6fc;
      font-size: 14px;
      font-weight: 500;
    }
    .header-path {
      color: #7d8590;
      font-size: 12px;
    }
    .container {
      max-width: 860px;
      margin: 32px auto;
      padding: 32px;
      background: #ffffff;
      border: 1px solid #d0d7de;
      border-radius: 6px;
    }
    .markdown-body {
      color: #24292f;
    }
    .markdown-body h1, .markdown-body h2, .markdown-body h3,
    .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      color: #1f2328;
    }
    .markdown-body h1 { font-size: 2em; border-bottom: 1px solid #d8dee4; padding-bottom: 0.3em; }
    .markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid #d8dee4; padding-bottom: 0.3em; }
    .markdown-body h3 { font-size: 1.25em; }
    .markdown-body h4 { font-size: 1em; }
    .markdown-body h5 { font-size: 0.875em; }
    .markdown-body h6 { font-size: 0.85em; color: #656d76; }
    .markdown-body p { margin-top: 0; margin-bottom: 16px; }
    .markdown-body a { color: #0969da; text-decoration: none; }
    .markdown-body a:hover { text-decoration: underline; }
    .markdown-body ul, .markdown-body ol {
      margin-top: 0;
      margin-bottom: 16px;
      padding-left: 2em;
    }
    .markdown-body ul { list-style-type: disc; }
    .markdown-body ol { list-style-type: decimal; }
    .markdown-body li + li { margin-top: 0.25em; }
    .markdown-body code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 85%;
      padding: 0.2em 0.4em;
      background: rgba(175, 184, 193, 0.2);
      border-radius: 6px;
    }
    .markdown-body pre {
      background: #161b22;
      border-radius: 6px;
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
      margin-bottom: 16px;
    }
    .markdown-body pre code {
      background: transparent;
      padding: 0;
      border-radius: 0;
      color: #c9d1d9;
    }
    .markdown-body blockquote {
      margin: 0 0 16px;
      padding: 0 1em;
      color: #656d76;
      border-left: 0.25em solid #d0d7de;
    }
    .markdown-body table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
    }
    .markdown-body th, .markdown-body td {
      padding: 6px 13px;
      border: 1px solid #d0d7de;
    }
    .markdown-body th { background: #f6f8fa; font-weight: 600; }
    .markdown-body tr:nth-child(2n) { background: #f6f8fa; }
    .markdown-body img { max-width: 100%; height: auto; }
    .markdown-body hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background: #d0d7de;
      border: 0;
    }
    .anchor { float: left; margin-left: -20px; padding-right: 4px; line-height: 1; }
    .anchor:focus { outline: none; }
    .anchor-link { color: #656d76; text-decoration: none; visibility: hidden; }
    .markdown-body h1:hover .anchor-link,
    .markdown-body h2:hover .anchor-link,
    .markdown-body h3:hover .anchor-link,
    .markdown-body h4:hover .anchor-link,
    .markdown-body h5:hover .anchor-link,
    .markdown-body h6:hover .anchor-link { visibility: visible; }
    @media (max-width: 900px) {
      .container { margin: 16px; padding: 20px; }
      .header { padding: 12px 16px; }
    }
    @media (max-width: 480px) {
      .container { margin: 8px; padding: 16px; }
    }
    /* Syntax highlighting colors for dark code blocks */
    .hljs-keyword { color: #ff7b72; }
    .hljs-string { color: #a5d6ff; }
    .hljs-number { color: #79c0ff; }
    .hljs-comment { color: #8b949e; font-style: italic; }
    .hljs-function { color: #d2a8ff; }
    .hljs-class { color: #ffa657; }
    .hljs-variable { color: #ffa657; }
    .hljs-operator { color: #ff7b72; }
    .hljs-punctuation { color: #c9d1d9; }
    .hljs-property { color: #79c0ff; }
    .hljs-tag { color: #7ee787; }
    .hljs-attr { color: #79c0ff; }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-left">
      <a href="/" class="header-logo">mdsvr</a>
      <span class="header-path">/</span>
      <span class="header-filename">${escapeHtml(title)}</span>
    </div>
    <span class="header-path">${escapeHtml(filePath)}</span>
  </header>
  <div class="container">
    <div class="markdown-body">
${body}
    </div>
  </div>
</body>
</html>`;
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
