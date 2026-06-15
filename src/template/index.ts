import type { Settings } from "../settings/index.js";
import type { TocItem } from "../renderer/markdown.js";
import { buildSeoTags, type SeoData } from "./seo.js";
import { renderSidebar, renderToc, type NavItem } from "./sidebar.js";
import {
  renderSearchModal,
  renderSearchTrigger,
  getSearchInlineScript,
} from "./search.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function scopeCss(css: string, selector: string): string {
  return css.replace(/(^|\n)(\.hljs)/g, `$1${selector} $2`);
}

function getHighlightJsStyles(settings: Settings): string {
  const lightTheme = settings.appearance.codeTheme.light || "github";
  const darkTheme = settings.appearance.codeTheme.dark || "github-dark";

  try {
    // Read from local assets folder
    const hljsStylesPath = join(__dirname, "../assets/highlight.js-styles");

    const lightCss = readFileSync(
      join(hljsStylesPath, `${lightTheme}.css`),
      "utf-8",
    );
    const darkCss = readFileSync(
      join(hljsStylesPath, `${darkTheme}.css`),
      "utf-8",
    );

    return `
${scopeCss(lightCss, ':root[data-theme="light"]')}
:root[data-theme="light"] .hljs { background: var(--code-bg); }

${scopeCss(darkCss, ':root[data-theme="dark"]')}
:root[data-theme="dark"] .hljs { background: var(--code-bg); }
`;
  } catch (error) {
    console.error("Error loading highlight.js styles:", error);
    // Fallback if CSS files not found
    return "";
  }
}

export interface TemplateParams {
  title: string;
  body: string;
  filePath: string;
  settings: Settings;
  frontmatter?: Record<string, unknown>;
  toc?: TocItem[];
  sidebar?: NavItem[];
  urlPath?: string;
}

export function renderPage(params: TemplateParams): string {
  const {
    title,
    body,
    filePath,
    settings,
    frontmatter = {},
    toc = [],
    sidebar = [],
    urlPath = "/",
  } = params;

  // Determine theme
  const defaultTheme = settings.appearance.defaultTheme;
  const themeScript = `
<script>
(function() {
  var theme = localStorage.getItem('theme') || '${defaultTheme}';
  if (theme === 'system') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
</script>`;

  // Build SEO data from frontmatter and settings
  const seoData: SeoData = {
    title: (frontmatter.title as string) || title,
    description:
      (frontmatter.description as string) || settings.site.description,
    image: (frontmatter.image as string) || settings.seo.defaultImage,
    url: urlPath,
    type: frontmatter.date ? "article" : "website",
    date: (frontmatter.date as string) || undefined,
    author: (frontmatter.author as string) || undefined,
    noIndex: (frontmatter.noIndex as boolean) || false,
  };

  const seoTags = buildSeoTags(seoData, settings);
  const pageTitle = settings.seo.titleTemplate.replace("%s", seoData.title);

  // Render sidebar if enabled
  const hasSidebar = settings.navigation.sidebar.enabled && sidebar.length > 0;
  const sidebarHtml = hasSidebar
    ? `<aside class="sidebar" id="sidebar">${renderSidebar(sidebar, settings)}</aside>`
    : "";

  // Sidebar toggle button for mobile
  const sidebarToggle = hasSidebar
    ? `<button class="sidebar-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')" aria-label="Toggle menu">☰</button>`
    : "";

  // Render TOC if enabled
  const tocHtml =
    settings.navigation.tocEnabled && toc.length > 0
      ? `<aside class="toc-sidebar">${renderToc(toc, settings)}</aside>`
      : "";

  // Search trigger in header
  const searchTrigger = renderSearchTrigger(settings);

  // Theme toggle
  const themeToggle = settings.appearance.allowThemeToggle
    ? `<button class="theme-toggle" onclick="toggleTheme()" title="Toggle theme">
        <span class="theme-icon-light">☀️</span>
        <span class="theme-icon-dark">🌙</span>
       </button>`
    : "";

  // Logo/header
  const logoHtml = settings.site.logo
    ? `<a href="${settings.site.logo.href}" class="site-logo">
        <img src="${settings.site.logo.src}" alt="${settings.site.logo.alt}" />
       </a>`
    : `<a href="/" class="site-logo">${settings.site.title}</a>`;

  // Footer
  const footerLinks = settings.footer.links
    .map(
      (link: { href: string; label: string }) =>
        `<a href="${link.href}">${escapeHtml(link.label)}</a>`,
    )
    .join(" | ");
  const footerHtml = `<footer class="footer">
    <div class="footer-content">
      <span>${escapeHtml(settings.footer.text)}</span>
      ${footerLinks ? `<span class="footer-links">${footerLinks}</span>` : ""}
    </div>
  </footer>`;

  // Breadcrumbs
  const breadcrumbs = settings.navigation.breadcrumbs
    ? renderBreadcrumbs(urlPath, settings)
    : "";

  return `<!DOCTYPE html>
<html lang="${settings.site.language}" data-theme="${defaultTheme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${themeScript}
  ${seoTags}
  ${settings.site.favicon ? `<link rel="icon" href="${settings.site.favicon}">` : ""}
  <style>
${getBaseStyles(settings)}
${getHighlightJsStyles(settings)}
  </style>
</head>
<body>
  <header class="site-header">
    <div class="header-left">
      ${sidebarToggle}
      ${logoHtml}
    </div>
    <div class="header-right">
      ${searchTrigger}
      ${themeToggle}
    </div>
  </header>

  <div class="site-container">
    ${sidebarHtml}
    <main class="content">
      ${breadcrumbs}
      <article class="markdown-body">
        ${body}
      </article>
      ${footerHtml}
    </main>
    ${tocHtml}
  </div>

  ${renderSearchModal(settings)}
  ${settings.search.enabled ? getSearchInlineScript() : ""}

  <script>
function rerenderMermaid(theme) {
  if (!window.__mermaid) return;
  var diagrams = document.querySelectorAll(".mermaid");
  if (!diagrams.length) return;

  diagrams.forEach(function (el) {
    var src = el.getAttribute("data-mermaid-src");
    if (src) el.textContent = src;
    else {
      el.setAttribute("data-mermaid-src", el.textContent);
    }
    el.removeAttribute("data-processed");
  });

  window.__mermaid.initialize({
    startOnLoad: false,
    theme: theme === "dark" ? "dark" : "default",
  });
  window.__mermaid.run({ nodes: diagrams });
}

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  rerenderMermaid(next);
}

// Sidebar collapse/expand
function initSidebarToggle() {
  var toggles = document.querySelectorAll('.nav-toggle');
  toggles.forEach(function(toggle) {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var isExpanded = toggle.getAttribute('data-expanded') === 'true';
      var navItem = toggle.closest('.nav-item');
      var children = navItem.querySelector('.nav-children');
      
      toggle.setAttribute('data-expanded', String(!isExpanded));
      if (children) {
        children.setAttribute('data-expanded', String(!isExpanded));
      }
    });
  });
}

// Listen for system theme changes
if (window.matchMedia) {
  var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addListener(function(e) {
    if (localStorage.getItem('theme') === 'system' || !localStorage.getItem('theme')) {
      var next = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      rerenderMermaid(next);
    }
  });
}

// Mermaid toolbar interactivity
function initMermaidToolbars() {
  var containers = document.querySelectorAll('.mermaid-container');
  containers.forEach(function(container) {
    var chartBtn = container.querySelector('.mermaid-btn-chart');
    var fullscreenBtn = container.querySelector('.mermaid-btn-fullscreen');
    var codeBtn = container.querySelector('.mermaid-btn-code');
    var zoomInBtn = container.querySelector('.mermaid-btn-zoom-in');
    var zoomOutBtn = container.querySelector('.mermaid-btn-zoom-out');
    var chartDiv = container.querySelector('.mermaid-chart');
    var mermaidInner = container.querySelector('.mermaid');
    var zoom = 1;
    var panX = 0;
    var panY = 0;
    var isDragging = false;
    var dragStartX = 0;
    var dragStartY = 0;
    var dragStartPanX = 0;
    var dragStartPanY = 0;
    if (chartBtn) chartBtn.classList.add('active');

    function applyTransform() {
      if (mermaidInner) {
        mermaidInner.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoom + ')';
        mermaidInner.style.transformOrigin = 'center center';
      }
    }

    function resetTransform() {
      zoom = 1;
      panX = 0;
      panY = 0;
      if (mermaidInner) {
        mermaidInner.style.transform = '';
        mermaidInner.style.transformOrigin = '';
        mermaidInner.style.cursor = '';
      }
    }

    function clearActive() {
      if (chartBtn) chartBtn.classList.remove('active');
      if (fullscreenBtn) fullscreenBtn.classList.remove('active');
      if (codeBtn) codeBtn.classList.remove('active');
    }

    function fitToFullscreen() {
      if (!chartDiv) return;
      var svg = chartDiv.querySelector('svg');
      if (!svg) return;
      resetTransform();
      svg.style.maxWidth = '100%';
      svg.style.maxHeight = '100%';
      svg.style.width = 'auto';
      svg.style.height = 'auto';
    }

    function resetFromFullscreen() {
      if (!chartDiv) return;
      var svg = chartDiv.querySelector('svg');
      if (svg) {
        svg.style.maxWidth = '100%';
        svg.style.maxHeight = '';
        svg.style.width = '';
        svg.style.height = '';
      }
      resetTransform();
    }

    // Wheel zoom (fullscreen only)
    if (chartDiv) {
      chartDiv.addEventListener('wheel', function(e) {
        if (!container.classList.contains('fullscreen')) return;
        e.preventDefault();
        var delta = e.deltaY > 0 ? -0.03 : 0.03;
        var newZoom = Math.min(Math.max(zoom + delta, 0.1), 10);
        // Zoom toward mouse cursor position
        var rect = mermaidInner ? mermaidInner.getBoundingClientRect() : chartDiv.getBoundingClientRect();
        var mouseX = e.clientX - rect.left - rect.width / 2;
        var mouseY = e.clientY - rect.top - rect.height / 2;
        panX = panX - mouseX * (newZoom / zoom - 1);
        panY = panY - mouseY * (newZoom / zoom - 1);
        zoom = newZoom;
        applyTransform();
      }, { passive: false });

      // Drag/pan (fullscreen only)
      chartDiv.addEventListener('mousedown', function(e) {
        if (!container.classList.contains('fullscreen')) return;
        if (e.button !== 0) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartPanX = panX;
        dragStartPanY = panY;
        chartDiv.style.cursor = 'grabbing';
        if (mermaidInner) mermaidInner.style.cursor = 'grabbing';
        e.preventDefault();
      });
    }

    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      panX = dragStartPanX + (e.clientX - dragStartX);
      panY = dragStartPanY + (e.clientY - dragStartY);
      applyTransform();
    });

    document.addEventListener('mouseup', function(e) {
      if (!isDragging) return;
      isDragging = false;
      if (chartDiv) chartDiv.style.cursor = '';
      if (mermaidInner) mermaidInner.style.cursor = '';
    });

    if (chartBtn) {
      chartBtn.addEventListener('click', function() {
        container.removeAttribute('data-mode');
        container.classList.remove('fullscreen');
        document.body.style.overflow = '';
        resetFromFullscreen();
        clearActive();
        chartBtn.classList.add('active');
      });
    }

    if (codeBtn) {
      codeBtn.addEventListener('click', function() {
        container.classList.remove('fullscreen');
        document.body.style.overflow = '';
        resetFromFullscreen();
        container.setAttribute('data-mode', 'code');
        clearActive();
        codeBtn.classList.add('active');
      });
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', function() {
        container.removeAttribute('data-mode');
        container.classList.add('fullscreen');
        document.body.style.overflow = 'hidden';
        clearActive();
        fullscreenBtn.classList.add('active');
        setTimeout(fitToFullscreen, 0);
      });
    }

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', function() {
        if (!container.classList.contains('fullscreen')) return;
        zoom = Math.min(zoom + 0.25, 10);
        applyTransform();
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', function() {
        if (!container.classList.contains('fullscreen')) return;
        zoom = Math.max(zoom - 0.25, 0.1);
        applyTransform();
      });
    }
  });

  // ESC to exit fullscreen
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var fs = document.querySelector('.mermaid-container.fullscreen');
      if (fs) {
        fs.classList.remove('fullscreen');
        document.body.style.overflow = '';
        var btns = fs.querySelectorAll('.mermaid-btn');
        btns.forEach(function(b) { b.classList.remove('active'); });
        var chartBtn = fs.querySelector('.mermaid-btn-chart');
        if (chartBtn) chartBtn.classList.add('active');
        // Reset SVG sizing
        var chartDiv = fs.querySelector('.mermaid-chart');
        var mermaidInner = fs.querySelector('.mermaid');
        if (mermaidInner) {
          mermaidInner.style.transform = '';
          mermaidInner.style.transformOrigin = '';
          mermaidInner.style.cursor = '';
        }
        if (chartDiv) {
          chartDiv.style.cursor = '';
          var svg = chartDiv.querySelector('svg');
          if (svg) {
            svg.style.maxWidth = '100%';
            svg.style.maxHeight = '';
            svg.style.width = '';
            svg.style.height = '';
          }
        }
      }
    }
  });
}

// Initialize sidebar toggle on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    initSidebarToggle();
    initMermaidToolbars();
  });
} else {
  initSidebarToggle();
  initMermaidToolbars();
}
  </script>

  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const diagrams = document.querySelectorAll('.mermaid');
    diagrams.forEach(function(el) {
      el.setAttribute('data-mermaid-src', el.textContent);
    });
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
    });
    mermaid.run({ nodes: diagrams });
    window.__mermaid = mermaid;
  </script>
</body>
</html>`;
}

function renderBreadcrumbs(urlPath: string, settings: Settings): string {
  if (urlPath === "/") return "";

  const parts = urlPath.split("/").filter(Boolean);
  let accum = "";

  const links = parts.map((part, i) => {
    accum += "/" + part;
    const isLast = i === parts.length - 1;
    const label = humanize(part);
    if (isLast) {
      return `<span class="breadcrumb-current">${escapeHtml(label)}</span>`;
    }
    return `<a href="${accum}">${escapeHtml(label)}</a>`;
  });

  return `<nav class="breadcrumbs">
    <a href="/">Home</a>
    ${links.length > 0 ? '<span class="breadcrumb-sep">/</span>' + links.join('<span class="breadcrumb-sep">/</span>') : ""}
  </nav>`;
}

function humanize(str: string): string {
  return str
    .replace(/[-_]/g, " ")
    .replace(/\.\w+$/, "")
    .replace(/^\w/, (c) => c.toUpperCase());
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

function getBaseStyles(settings: Settings): string {
  const accentColor = settings.appearance.accentColor;

  return `
:root {
  --accent-color: ${accentColor};
}

:root[data-theme="light"] {
  --bg: #ffffff;
  --bg-secondary: #f6f8fa;
  --border: #d1d9e0;
  --text: #1f2328;
  --text-muted: #636c76;
  --accent: var(--accent-color, #0969da);
  --code-bg: #f6f8fa;
  --sidebar-width: 260px;
  --toc-width: 220px;
}

:root[data-theme="dark"] {
  --bg: #0d1117;
  --bg-secondary: #161b22;
  --border: #30363d;
  --text: #e6edf3;
  --text-muted: #8d96a0;
  --accent: var(--accent-color, #58a6ff);
  --code-bg: #161b22;
  --sidebar-width: 260px;
  --toc-width: 220px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: ${settings.appearance.fontFamily.body || "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif"};
  font-size: 16px;
  line-height: 1.6;
  color: var(--text);
  background: var(--bg);
}

.site-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 100;
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.site-logo {
  color: var(--text);
  font-weight: 600;
  font-size: 18px;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.site-logo img {
  height: 28px;
  width: auto;
}

.search-trigger, .theme-toggle, .sidebar-toggle {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-trigger:hover, .theme-toggle:hover, .sidebar-toggle:hover {
  border-color: var(--accent);
  color: var(--text);
}

.sidebar-toggle {
  display: none;
  font-size: 18px;
  padding: 6px 10px;
}

@media (max-width: 768px) {
  .sidebar-toggle {
    display: flex;
  }
}

.search-shortcut {
  font-size: 12px;
  opacity: 0.6;
}

.site-container {
  display: flex;
  margin-top: 60px;
  min-height: calc(100vh - 60px);
}

.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  padding: 24px 16px;
  overflow-y: auto;
  position: fixed;
  top: 60px;
  bottom: 0;
  left: 0;
}

.sidebar-nav {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  margin: 4px 0;
}

.nav-link {
  display: block;
  padding: 6px 12px;
  color: var(--text-muted);
  text-decoration: none;
  border-radius: 6px;
  font-size: 14px;
}

.nav-link:hover {
  background: var(--bg);
  color: var(--text);
}

.nav-link.active {
  background: var(--accent);
  color: white;
}

.nav-children {
  margin-left: 4px;
  border-left: 1px solid var(--border);
  padding-left: 10px;
}

.nav-children[data-expanded="false"] {
  display: none;
}

.nav-item-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 10px;
  color: var(--text-muted);
  transition: transform 0.2s;
  display: flex;
  align-items: center;
}

.nav-toggle:hover {
  color: var(--text);
}

.nav-toggle[data-expanded="true"] {
  transform: rotate(90deg);
}

.content {
  flex: 1;
  margin-left: var(--sidebar-width);
  padding: 32px 48px;
  max-width: calc(100% - var(--sidebar-width) - var(--toc-width));
}

.toc-sidebar {
  width: var(--toc-width);
  flex-shrink: 0;
  padding: 32px 24px;
  position: fixed;
  right: 0;
  top: 60px;
  bottom: 0;
  overflow-y: auto;
}

.toc h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--text-muted);
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.toc-level-1 {
  padding-left: 0;
}

.toc-level-2 {
  padding-left: 8px;
}

.toc-level-3 {
  padding-left: 16px;
}

.toc-level-4 {
  padding-left: 24px;
}

.toc-level-5 {
  padding-left: 32px;
}

.toc-level-6 {
  padding-left: 40px;
}

.toc-item {
  margin: 4px 0;
  position: relative;
}

.toc-level-2 > .toc-item::before,
.toc-level-3 > .toc-item::before,
.toc-level-4 > .toc-item::before,
.toc-level-5 > .toc-item::before,
.toc-level-6 > .toc-item::before {
  content: "▸";
  position: absolute;
  left: -12px;
  color: var(--text-muted);
  font-size: 10px;
  top: 5px;
}

.toc-item a {
  display: block;
  padding: 4px 0;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 13px;
}

.toc-item a:hover {
  color: var(--accent);
}

.breadcrumbs {
  margin-bottom: 24px;
  font-size: 14px;
  color: var(--text-muted);
}

.breadcrumbs a {
  color: var(--accent);
  text-decoration: none;
}

.breadcrumb-sep {
  margin: 0 8px;
  opacity: 0.5;
}

.markdown-body {
  max-width: 800px;
}

.markdown-body h1, .markdown-body h2, .markdown-body h3,
.markdown-body h4, .markdown-body h5, .markdown-body h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--text);
  scroll-margin-top: 80px;
}

.markdown-body h1 { font-size: 2em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
.markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
.markdown-body h3 { font-size: 1.25em; }
.markdown-body h4 { font-size: 1em; }
.markdown-body h5 { font-size: 0.875em; }
.markdown-body h6 { font-size: 0.85em; color: var(--text-muted); }
.markdown-body p { margin-top: 0; margin-bottom: 16px; }
.markdown-body a { color: var(--accent); text-decoration: none; }
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
  font-family: ${settings.appearance.fontFamily.code || "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace"};
  padding: 0.2em 0.4em;
  background: var(--code-bg);
  border-radius: 6px;
}
.markdown-body pre {
  background: var(--code-bg);
  border-radius: 6px;
  padding: 16px;
  overflow: auto;
  line-height: 1.45;
  margin-bottom: 16px;
}
.markdown-body pre code {
  background: transparent;
  padding: 0;
  border-radius: 0;
}
.markdown-body blockquote {
  margin: 0 0 16px;
  padding: 0 1em;
  color: var(--text-muted);
  border-left: 0.25em solid var(--border);
}
.markdown-body table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}
.markdown-body th, .markdown-body td {
  padding: 6px 13px;
  border: 1px solid var(--border);
}
.markdown-body th { background: var(--bg-secondary); font-weight: 600; }
.markdown-body tr:nth-child(2n) { background: var(--bg-secondary); }
.markdown-body img { max-width: 100%; height: auto; }
.markdown-body hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background: var(--border);
  border: 0;
}

.footer {
  margin-top: 64px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  font-size: 14px;
  color: var(--text-muted);
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.footer-links a {
  color: var(--accent);
  text-decoration: none;
}

/* Search modal styles */
.search-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
}

.search-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.search-container {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600px;
  background: var(--bg);
  border-radius: 8px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.search-header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 16px;
  color: var(--text);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-muted);
  cursor: pointer;
}

.search-results {
  max-height: 400px;
  overflow-y: auto;
}

.search-result {
  display: block;
  padding: 12px 16px;
  text-decoration: none;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}

.search-result:hover, .search-result.selected {
  background: var(--bg-secondary);
}

.search-result-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.search-result-excerpt {
  font-size: 14px;
  color: var(--text-muted);
}

.search-result-excerpt mark {
  background: rgba(255, 215, 0, 0.3);
  color: inherit;
}

.search-footer {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 12px;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
}

.search-footer kbd {
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.search-no-results {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
}

/* MDX Components - Light mode */
.callout {
  border-left: 4px solid;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
}
.callout-info {
  border-color: #0969da;
  background: #ddf4ff;
}
.callout-warning {
  border-color: #9a6700;
  background: #fff8c5;
}
.callout-danger {
  border-color: #cf222e;
  background: #ffebe9;
}
.callout-success {
  border-color: #1a7f37;
  background: #dafbe1;
}
.callout-tip {
  border-color: #bf3989;
  background: #ffeff7;
}

/* MDX Components - Dark mode */
[data-theme="dark"] .callout-info {
  border-color: #58a6ff;
  background: #0c1c38;
}
[data-theme="dark"] .callout-warning {
  border-color: #d29922;
  background: #241c04;
}
[data-theme="dark"] .callout-danger {
  border-color: #f85149;
  background: #3c0e0e;
}
[data-theme="dark"] .callout-success {
  border-color: #3fb950;
  background: #0f2616;
}
[data-theme="dark"] .callout-tip {
  border-color: #db61a2;
  background: #2a0e1f;
}

/* CodeGroup */
.code-group {
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 16px;
  overflow: hidden;
}
.code-group-title {
  background: var(--bg-secondary);
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

/* Steps */
.steps {
  counter-reset: step;
  margin-bottom: 16px;
}
.steps > * {
  position: relative;
  padding-left: 40px;
  margin-bottom: 16px;
}
.steps > *::before {
  counter-increment: step;
  content: counter(step);
  position: absolute;
  left: 0;
  top: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

/* Cards */
.card-group {
  display: grid;
  gap: 16px;
  margin-bottom: 16px;
}
.card {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 16px;
  background: var(--bg-secondary);
  text-decoration: none;
  color: var(--text);
  display: block;
}
.card:hover {
  border-color: var(--accent);
}
.card-title {
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-description {
  font-size: 14px;
  color: var(--text-muted);
}

/* Badge */
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
.badge-blue { background: #0969da; color: white; }
.badge-green { background: #1a7f37; color: white; }
.badge-orange { background: #9a6700; color: white; }
.badge-red { background: #cf222e; color: white; }
.badge-purple { background: #8250df; color: white; }
.badge-gray { background: #6e7781; color: white; }

[data-theme="dark"] .badge-blue { background: #58a6ff; }
[data-theme="dark"] .badge-green { background: #3fb950; }
[data-theme="dark"] .badge-orange { background: #d29922; }
[data-theme="dark"] .badge-red { background: #f85149; }
[data-theme="dark"] .badge-purple { background: #a371f7; }
[data-theme="dark"] .badge-gray { background: #8c959f; }

/* Accordion */
.accordion {
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 16px;
}
.accordion-summary {
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 600;
  background: var(--bg-secondary);
  border-radius: 6px;
}
.accordion-content {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}
.accordion-icon {
  display: inline-block;
  transition: transform 0.2s;
}
.accordion-icon.open {
  transform: rotate(180deg);
}

/* Tabs */
.tabs-container {
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 16px;
  overflow: hidden;
}
.tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
}
.tab {
  padding: 8px 16px;
  cursor: pointer;
  border: none;
  background: transparent;
  font-size: 14px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  color: var(--text-muted);
}
.tab.active {
  border-bottom-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
  background: var(--bg);
}
.tab-content {
  padding: 16px;
}

/* Mermaid wrapper - reset pre defaults */
.mermaid-wrapper {
  all: unset;
  display: block;
}

pre.mermaid-wrapper{
  padding: 0;
}


/* Mermaid container */
.mermaid-container {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
}
.mermaid-toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
}
.mermaid-container:hover .mermaid-toolbar {
  opacity: 1;
}
.mermaid-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.mermaid-btn:hover {
  color: var(--text);
  border-color: var(--accent);
  background: var(--bg-secondary);
}
.mermaid-btn.active {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--bg-secondary);
}
.mermaid-zoom-controls {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: none;
  flex-direction: column;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
}
.mermaid-container[data-mode="code"] .mermaid-zoom-controls {
  display: none;
}
.mermaid-chart {
  padding: 16px;
  overflow: auto;
  text-align: center;
  min-height: 80px;
  transition: transform 0.1s ease;
}
.mermaid-chart .mermaid svg {
  max-width: 100%;
  height: auto;
}
.mermaid-source {
  display: none;
  margin: 0;
  border-radius: 0;
  background: var(--code-bg);
  padding: 16px;
}
.mermaid-container[data-mode="code"] .mermaid-chart {
  display: none;
}
.mermaid-container[data-mode="code"] .mermaid-source {
  display: block;
}
/* Mermaid fullscreen */
.mermaid-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  border-radius: 0;
  border: none;
  margin: 0;
  overflow: visible;
  background: var(--bg);
}
.mermaid-container.fullscreen .mermaid-toolbar {
  opacity: 1;
  top: 16px;
  right: 16px;
}
.mermaid-container.fullscreen .mermaid-zoom-controls {
  display: flex;
  opacity: 1;
  bottom: 16px;
  right: 16px;
}
.mermaid-container.fullscreen .mermaid-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 48px;
  overflow: hidden;
  cursor: grab;
  user-select: none;
}
.mermaid-container.fullscreen .mermaid-chart:active {
  cursor: grabbing;
}
.mermaid-container.fullscreen .mermaid-chart .mermaid {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  will-change: transform;
}

/* Responsive */
@media (max-width: 1024px) {
  .toc-sidebar {
    display: none;
  }
  .content {
    max-width: none;
    margin-right: 0;
  }
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.2s;
    z-index: 90;
    box-shadow: 2px 0 8px rgba(0,0,0,0.1);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .content {
    margin-left: 0;
    padding: 24px;
  }
  .site-container {
    flex-direction: column;
  }
}

/* Theme icons */
:root[data-theme="light"] .theme-icon-dark,
:root[data-theme="dark"] .theme-icon-light {
  display: none;
}
`;
}
