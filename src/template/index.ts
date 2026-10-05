import type { Settings } from "../settings/index.js";
import type { TocItem, MarkdownResult } from "../renderer/markdown.js";
import { buildJsonLd, resolveSeoData, type PageKind } from "../seo/index.js";
import { buildSeoTags } from "./seo.js";
import {
  renderSidebar,
  renderToc,
  getPrevNext,
  type NavItem,
} from "./sidebar.js";
import {
  renderSearchModal,
  renderSearchTrigger,
  getSearchInlineScript,
} from "./search.js";
import {
  buildVerificationTags,
  buildAnalyticsHeadTags,
  buildBodyStartTags,
} from "./analytics.js";
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
  /** Raw markdown/MDX source — enables meta description auto-extraction. */
  content?: string;
  /** Page kind for SEO/JSON-LD ("document" default). */
  kind?: PageKind;
  toc?: TocItem[];
  sidebar?: NavItem[];
  urlPath?: string;
  isStaticExport?: boolean;
  /** Source-file dates — fallback for `article:*` times and JSON-LD dates. */
  fileDates?: { published?: Date; modified?: Date };
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
    isStaticExport = false,
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
  var contentView = localStorage.getItem('content-view') || 'contained';
  document.documentElement.setAttribute('data-content-view', contentView);
})();
</script>`;

  // Resolve SEO data: frontmatter → auto-extracted → site defaults
  const seoData = resolveSeoData({
    frontmatter,
    content: params.content,
    title,
    urlPath,
    kind: params.kind,
    settings,
    sidebar,
    isStaticExport,
    fileDates: params.fileDates,
  });

  const seoTags = buildSeoTags(seoData, settings);
  const jsonLd = buildJsonLd(seoData, settings);
  const verificationTags = buildVerificationTags(settings);
  const analyticsHeadTags = buildAnalyticsHeadTags(settings);
  const bodyStartTags = buildBodyStartTags(settings);

  // Render sidebar if enabled
  const hasSidebar = settings.navigation.sidebar.enabled && sidebar.length > 0;
  const sidebarHtml = hasSidebar
    ? `<aside class="sidebar" id="sidebar">${renderSidebar(sidebar, settings, 0, isStaticExport)}</aside>`
    : "";

  // Sidebar toggle buttons
  const sidebarToggle = hasSidebar
    ? `<button class="sidebar-toggle sidebar-toggle-mobile" onclick="document.getElementById('sidebar').classList.toggle('open')" aria-label="Toggle menu">☰</button><button class="sidebar-toggle sidebar-toggle-desktop" onclick="toggleDesktopSidebar()" aria-label="Toggle sidebar">☰</button>`
    : "";

  // Render TOC if enabled
  const hasToc = settings.navigation.tocEnabled && toc.length > 0;
  const tocHtml = hasToc
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
  const viewToggle = `<button class="view-toggle" onclick="toggleContentView()" title="Use wide content view" aria-label="Use wide content view" aria-pressed="false">
    <span class="view-icon-contained" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="4" width="14" height="16" rx="1"/><path d="M9 8h6M9 12h6M9 16h4"/></svg></span>
    <span class="view-icon-wide" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M7 8h10M7 12h10M7 16h7"/></svg></span>
  </button>`;

  // Logo/header
  const logoHref = settings.site.logo
    ? settings.site.logo.href
    : withBasePath("/", settings, isStaticExport);
  const logoHtml = settings.site.logo
    ? `<a href="${logoHref}" class="site-logo">
        <img src="${settings.site.logo.src}" alt="${settings.site.logo.alt}" />
       </a>`
    : `<a href="${logoHref}" class="site-logo">${settings.site.title}</a>`;

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
    ? renderBreadcrumbs(urlPath, settings, isStaticExport)
    : "";

  // Prev/Next links
  let prevNextHtml = "";
  if (settings.navigation.prevNextLinks && sidebar.length > 0) {
    const { prev, next } = getPrevNext(sidebar, urlPath);
    if (prev || next) {
      prevNextHtml = `<nav class="prev-next-nav">
        ${prev ? `<a href="${withBasePath(prev.href, settings, isStaticExport)}" class="prev-next-card prev-card"><span class="prev-next-label">← Prev</span><span class="prev-next-title">${escapeHtml(prev.title)}</span></a>` : `<span></span>`}
        ${next ? `<a href="${withBasePath(next.href, settings, isStaticExport)}" class="prev-next-card next-card"><span class="prev-next-label">Next →</span><span class="prev-next-title">${escapeHtml(next.title)}</span></a>` : `<span></span>`}
      </nav>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="${settings.site.language}" data-theme="${defaultTheme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${themeScript}
  ${seoTags}
  ${jsonLd}
  ${verificationTags}
  ${settings.site.favicon ? `<link rel="icon" href="${escapeHtml(withBasePath(normalizeAssetPath(settings.site.favicon), settings, isStaticExport))}">` : ""}
  ${body.includes('class="katex') ? '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css" crossorigin="anonymous">' : ""}
  <style>
${getBaseStyles(settings)}
${getHighlightJsStyles(settings)}
  </style>
  ${analyticsHeadTags}
</head>
<body>
  ${bodyStartTags}
  <header class="site-header">
    <div class="header-left">
      ${sidebarToggle}
      ${logoHtml}
    </div>
    <div class="header-right">
      ${searchTrigger}
      ${viewToggle}
      ${themeToggle}
    </div>
  </header>

  <div class="site-container${hasToc ? " has-toc" : ""}">
    ${sidebarHtml}
    <main class="content">
      ${breadcrumbs}
      <article class="markdown-body">
        ${body}
      </article>
      ${prevNextHtml}
      ${footerHtml}
    </main>
    ${tocHtml}
  </div>

  ${renderSearchModal(settings)}
  ${settings.search.enabled ? getSearchInlineScript(settings.generate.basePath) : ""}

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

function updateContentViewToggle() {
  var isWide = document.documentElement.getAttribute('data-content-view') === 'wide';
  var button = document.querySelector('.view-toggle');
  if (!button) return;
  var label = isWide ? 'Use contained content view' : 'Use wide content view';
  button.setAttribute('title', label);
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-pressed', String(isWide));
}

function toggleContentView() {
  var isWide = document.documentElement.getAttribute('data-content-view') === 'wide';
  var next = isWide ? 'contained' : 'wide';
  document.documentElement.setAttribute('data-content-view', next);
  localStorage.setItem('content-view', next);
  updateContentViewToggle();
}

function toggleDesktopSidebar() {
  var collapsed = document.body.classList.toggle('sidebar-collapsed');
  localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0');
}

function initSidebarState() {
  if (localStorage.getItem('sidebar-collapsed') === '1') {
    document.body.classList.add('sidebar-collapsed');
  }
}

// Sidebar collapse/expand
function initSidebarToggle() {
  var headers = document.querySelectorAll('.nav-item-header');
  headers.forEach(function(header) {
    header.addEventListener('click', function(e) {
      if (e.target && e.target.closest && e.target.closest('a')) return;
      e.preventDefault();
      var isExpanded = header.getAttribute('data-expanded') === 'true';
      var next = !isExpanded;
      header.setAttribute('data-expanded', String(next));
      var navItem = header.closest('.nav-item');
      var children = navItem.querySelector('.nav-children');
      if (children) {
        children.setAttribute('data-expanded', String(next));
      }
      var iconSpan = header.querySelector('.folder-icon');
      if (iconSpan) {
        iconSpan.textContent = next ? '📂' : '📁';
      }
      var link = header.querySelector('.nav-link[data-folder-icon]');
      if (link) {
        link.setAttribute('data-folder-icon', next ? 'open' : 'closed');
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
  var fullscreenIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 15 6 6"/><path d="m15 9 6-6"/><path d="M21 16v5h-5"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/><path d="m3 21 6-6"/><path d="M3 8V3h5"/><path d="M9 9 3 3"/></svg>';
  var shrinkIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 15 6 6m-6-6v4.8m0-4.8h4.8"/><path d="M9 19.8V15m0 0H4.2M9 15l-6 6"/><path d="M15 4.2V9m0 0h4.8M15 9l6-6"/><path d="M9 4.2V9m0 0H4.2M9 9 3 3"/></svg>';

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

    function setFullscreenIcon(isFullscreen) {
      if (!fullscreenBtn) return;
      fullscreenBtn.innerHTML = isFullscreen ? shrinkIcon : fullscreenIcon;
      fullscreenBtn.setAttribute('title', isFullscreen ? 'Exit fullscreen' : 'Fullscreen');
    }

    function applyTransform() {
      if (mermaidInner) {
        var svg = mermaidInner.querySelector('svg');
        if (svg) {
          svg.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoom + ')';
          svg.style.transformOrigin = 'center center';
        }
      }
    }

    function resetTransform() {
      zoom = 1;
      panX = 0;
      panY = 0;
      if (mermaidInner) {
        var svg = mermaidInner.querySelector('svg');
        if (svg) {
          svg.style.transform = '';
          svg.style.transformOrigin = '';
        }
        mermaidInner.style.cursor = '';
      }
    }

    function clearActive() {
      if (chartBtn) chartBtn.classList.remove('active');
      if (fullscreenBtn) fullscreenBtn.classList.remove('active');
      if (codeBtn) codeBtn.classList.remove('active');
    }

    function fitToViewport() {
      if (!chartDiv) return;
      var svg = chartDiv.querySelector('svg');
      if (!svg) return;
      resetTransform();
      svg.style.maxWidth = '100%';
      svg.style.maxHeight = '100%';
      svg.style.width = 'auto';
      svg.style.height = 'auto';
    }

    function resetFromViewport() {
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

    // Wheel zoom and drag/pan (fullscreen only)
    if (chartDiv) {
      chartDiv.addEventListener('wheel', function(e) {
        if (!container.classList.contains('fullscreen')) return;
        e.preventDefault();
        var delta = e.deltaY > 0 ? -0.03 : 0.03;
        var newZoom = Math.min(Math.max(zoom + delta, 0.5), 10);
        // Zoom toward mouse cursor position
        var rect = mermaidInner ? mermaidInner.getBoundingClientRect() : chartDiv.getBoundingClientRect();
        var mouseX = e.clientX - rect.left - rect.width / 2;
        var mouseY = e.clientY - rect.top - rect.height / 2;
        panX = panX - mouseX * (newZoom / zoom - 1);
        panY = panY - mouseY * (newZoom / zoom - 1);
        zoom = newZoom;
        applyTransform();
      }, { passive: false });

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
        resetFromViewport();
        clearActive();
        chartBtn.classList.add('active');
        setFullscreenIcon(false);
      });
    }

    if (codeBtn) {
      codeBtn.addEventListener('click', function() {
        container.classList.remove('fullscreen');
        document.body.style.overflow = '';
        resetFromViewport();
        container.setAttribute('data-mode', 'code');
        clearActive();
        codeBtn.classList.add('active');
        setFullscreenIcon(false);
      });
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', function() {
        if (container.classList.contains('fullscreen')) {
          container.removeAttribute('data-mode');
          container.classList.remove('fullscreen');
          document.body.style.overflow = '';
          resetFromViewport();
          clearActive();
          if (chartBtn) chartBtn.classList.add('active');
          setFullscreenIcon(false);
        } else {
          container.removeAttribute('data-mode');
          container.classList.add('fullscreen');
          document.body.style.overflow = 'hidden';
          clearActive();
          fullscreenBtn.classList.add('active');
          setFullscreenIcon(true);
          setTimeout(fitToViewport, 0);
        }
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
        zoom = Math.max(zoom - 0.25, 0.5);
        applyTransform();
      });
    }
  });

  // ESC to exit fullscreen
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var target = document.querySelector('.mermaid-container.fullscreen');
      if (target) {
        target.classList.remove('fullscreen');
        document.body.style.overflow = '';
        var btns = target.querySelectorAll('.mermaid-btn');
        btns.forEach(function(b) { b.classList.remove('active'); });
        var chartBtn = target.querySelector('.mermaid-btn-chart');
        if (chartBtn) chartBtn.classList.add('active');
        var fsBtn = target.querySelector('.mermaid-btn-fullscreen');
        if (fsBtn) {
          fsBtn.innerHTML = fullscreenIcon;
          fsBtn.setAttribute('title', 'Fullscreen');
        }
        // Reset SVG sizing
        var chartDiv = target.querySelector('.mermaid-chart');
        var mermaidInner = target.querySelector('.mermaid');
        if (mermaidInner) {
          var svg = mermaidInner.querySelector('svg');
          if (svg) {
            svg.style.transform = '';
            svg.style.transformOrigin = '';
          }
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

// Code block toolbar interactivity
function initCodeBlockToolbars() {
  var copyIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  var copiedIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
  var wrapIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16-3 3 3 3"/><path d="M3 12h14.5a1 1 0 0 1 0 7H13"/><path d="M3 19h6"/><path d="M3 5h18"/></svg>';
  var unwrapIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h6"/></svg>';
  var fullscreenIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 15 6 6"/><path d="m15 9 6-6"/><path d="M21 16v5h-5"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/><path d="m3 21 6-6"/><path d="M3 8V3h5"/><path d="M9 9 3 3"/></svg>';
  var shrinkIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 15 6 6m-6-6v4.8m0-4.8h4.8"/><path d="M9 19.8V15m0 0H4.2M9 15l-6 6"/><path d="M15 4.2V9m0 0h4.8M15 9l6-6"/><path d="M9 4.2V9m0 0H4.2M9 9 3 3"/></svg>';
  var wrapKey = 'code-block-wrap';
  var savedWrap = localStorage.getItem(wrapKey) === '1';

  function applyGlobalWrap(isWrapped) {
    document.querySelectorAll('.code-block-container').forEach(function(c) {
      var btn = c.querySelector('.code-block-btn-wrap');
      if (isWrapped) {
        c.classList.add('wrap');
        if (btn) {
          btn.innerHTML = unwrapIcon;
          btn.setAttribute('title', 'Unwrap code');
          btn.setAttribute('aria-label', 'Unwrap code');
        }
      } else {
        c.classList.remove('wrap');
        if (btn) {
          btn.innerHTML = wrapIcon;
          btn.setAttribute('title', 'Wrap code');
          btn.setAttribute('aria-label', 'Wrap code');
        }
      }
    });
  }

  if (savedWrap) {
    applyGlobalWrap(true);
  }

  var containers = document.querySelectorAll('.code-block-container');
  containers.forEach(function(container) {
    var copyBtn = container.querySelector('.code-block-btn-copy');
    var wrapBtn = container.querySelector('.code-block-btn-wrap');
    var fullscreenBtn = container.querySelector('.code-block-btn-fullscreen');

    function getRawCode() {
      return container.getAttribute('data-code') || '';
    }

    function fallbackCopy(text) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        if (copyBtn) {
          copyBtn.classList.add('active');
          copyBtn.innerHTML = copiedIcon;
          setTimeout(function() {
            copyBtn.classList.remove('active');
            copyBtn.innerHTML = copyIcon;
          }, 1000);
        }
      } catch (err) {
        // ignore
      }
      document.body.removeChild(textarea);
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var code = getRawCode();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(function() {
            copyBtn.classList.add('active');
            copyBtn.innerHTML = copiedIcon;
            setTimeout(function() {
              copyBtn.classList.remove('active');
              copyBtn.innerHTML = copyIcon;
            }, 1000);
          }).catch(function() {
            fallbackCopy(code);
          });
        } else {
          fallbackCopy(code);
        }
      });
    }

    if (wrapBtn) {
      wrapBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var isWrapped = !container.classList.contains('wrap');
        localStorage.setItem(wrapKey, isWrapped ? '1' : '0');
        applyGlobalWrap(isWrapped);
      });
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (container.classList.contains('fullscreen')) {
          container.classList.remove('fullscreen');
          document.body.style.overflow = '';
          fullscreenBtn.innerHTML = fullscreenIcon;
          fullscreenBtn.setAttribute('title', 'Fullscreen');
        } else {
          container.classList.add('fullscreen');
          document.body.style.overflow = 'hidden';
          fullscreenBtn.innerHTML = shrinkIcon;
          fullscreenBtn.setAttribute('title', 'Exit fullscreen');
        }
      });
    }
  });

  // ESC to exit fullscreen
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var target = document.querySelector('.code-block-container.fullscreen');
      if (target) {
        target.classList.remove('fullscreen');
        document.body.style.overflow = '';
        var fsBtn = target.querySelector('.code-block-btn-fullscreen');
        if (fsBtn) {
          fsBtn.innerHTML = fullscreenIcon;
          fsBtn.setAttribute('title', 'Fullscreen');
        }
      }
    }
  });
}

function initTableToolbars() {
  var fullscreenIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 15 6 6"/><path d="m15 9 6-6"/><path d="M21 16v5h-5"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/><path d="m3 21 6-6"/><path d="M3 8V3h5"/><path d="M9 9 3 3"/></svg>';
  var shrinkIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 15 6 6m-6-6v4.8m0-4.8h4.8"/><path d="M9 19.8V15m0 0H4.2M9 15l-6 6"/><path d="M15 4.2V9m0 0h4.8M15 9l6-6"/><path d="M9 4.2V9m0 0H4.2M9 9 3 3"/></svg>';

  function setFullscreen(wrapper, isFullscreen) {
    var button = wrapper.querySelector('.table-btn-fullscreen');
    wrapper.classList.toggle('fullscreen', isFullscreen);
    document.body.style.overflow = isFullscreen ? 'hidden' : '';
    if (button) {
      button.innerHTML = isFullscreen ? shrinkIcon : fullscreenIcon;
      button.setAttribute('title', isFullscreen ? 'Exit fullscreen table' : 'Fullscreen table');
      button.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen table' : 'Fullscreen table');
      button.setAttribute('aria-pressed', String(isFullscreen));
    }
  }

  document.querySelectorAll('.markdown-body table').forEach(function(table) {
    if (table.closest('.dir-listing')) return;
    var wrapper = table.parentElement;
    if (!wrapper || !wrapper.classList.contains('table-wrapper')) {
      wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
    var toolbar = wrapper.querySelector('.table-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'table-toolbar';
      wrapper.insertBefore(toolbar, table);
    }
    var button = toolbar.querySelector('.table-btn-fullscreen');
    if (!button) {
      button = document.createElement('button');
      button.className = 'table-btn-fullscreen';
      button.type = 'button';
      button.innerHTML = fullscreenIcon;
      button.setAttribute('title', 'Fullscreen table');
      button.setAttribute('aria-label', 'Fullscreen table');
      toolbar.appendChild(button);
    }
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', function() {
      var isFullscreen = wrapper.classList.contains('fullscreen');
      var openTable = document.querySelector('.table-wrapper.fullscreen');
      if (openTable && openTable !== wrapper) setFullscreen(openTable, false);
      setFullscreen(wrapper, !isFullscreen);
    });
  });

  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    var wrapper = document.querySelector('.table-wrapper.fullscreen');
    if (wrapper) {
      setFullscreen(wrapper, false);
      var button = wrapper.querySelector('.table-btn-fullscreen');
      if (button) button.focus();
    }
  });
}

// Quiz interactivity: grade answers client-side, persist stats per-user in
// localStorage. Answers live in data-answer attributes (honor system — this
// is self-study, not a secure assessment).
function initQuizzes() {
  function readStats(quizId) {
    try {
      var raw = localStorage.getItem('mdsvr-quiz:' + quizId);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveStats(quizId, score, total) {
    var stats = readStats(quizId) || { attempts: 0, best: 0 };
    stats.attempts += 1;
    stats.last = score;
    stats.total = total;
    stats.best = Math.max(stats.best || 0, score);
    stats.lastAt = Math.floor(Date.now() / 1000);
    try {
      localStorage.setItem('mdsvr-quiz:' + quizId, JSON.stringify(stats));
    } catch (e) { /* storage unavailable */ }
    return stats;
  }
  function attemptsLabel(stats) {
    return 'Best: ' + stats.best + '/' + stats.total + ' · ' + stats.attempts + (stats.attempts === 1 ? ' attempt' : ' attempts');
  }

  document.querySelectorAll('.quiz').forEach(function(quiz) {
    if (quiz.classList.contains('quiz-error')) return;
    var quizId = quiz.getAttribute('data-quiz-id') || '';
    var mode = quiz.getAttribute('data-quiz-mode') || 'exam';
    var questions = Array.prototype.slice.call(quiz.querySelectorAll('.quiz-question'));
    var progressEl = quiz.querySelector('.quiz-progress');
    var checkBtn = quiz.querySelector('.quiz-check');
    var resetBtn = quiz.querySelector('.quiz-reset');
    var resultEl = quiz.querySelector('.quiz-result');
    if (mode === 'practice' && checkBtn) checkBtn.hidden = true;

    function isAnswered(q) {
      if (q.getAttribute('data-qtype') === 'self-check') {
        return !!q.getAttribute('data-marked');
      }
      var inputs = q.querySelectorAll('.quiz-option input');
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].checked) return true;
      }
      return false;
    }

    function updateProgress() {
      if (!progressEl) return;
      var answered = 0;
      questions.forEach(function(q) { if (isAnswered(q)) answered++; });
      var stats = readStats(quizId);
      var text = answered + '/' + questions.length;
      if (stats && stats.attempts) text += ' · ' + attemptsLabel(stats);
      progressEl.textContent = text;
    }
    updateProgress();

    function gradeQuestion(q) {
      var qtype = q.getAttribute('data-qtype');
      var explanation = q.querySelector('.quiz-explanation');
      if (explanation) explanation.hidden = false;

      if (qtype === 'self-check') {
        var model = q.querySelector('.quiz-model-answer');
        var selfMark = q.querySelector('.quiz-self-mark');
        if (model) model.hidden = false;
        if (selfMark) selfMark.hidden = false;
        var marked = q.getAttribute('data-marked');
        if (!marked) return 'unanswered';
        q.classList.add(marked === 'correct' ? 'answered-correct' : 'answered-incorrect');
        return marked === 'correct' ? 'correct' : 'incorrect';
      }

      var answer = q.getAttribute('data-answer') || '';
      var labels = q.querySelectorAll('.quiz-option');
      var answered = false;
      var correct = false;

      if (qtype === 'multiple') {
        var expected = {};
        answer.split(',').forEach(function(a) { expected[a.trim()] = true; });
        var seen = {};
        correct = true;
        labels.forEach(function(label, idx) {
          var input = label.querySelector('input');
          var isExpected = expected[String(idx)] === true;
          if (input.checked) {
            answered = true;
            if (isExpected) {
              seen[String(idx)] = true;
              label.classList.add('correct');
            } else {
              correct = false;
              label.classList.add('incorrect');
            }
          } else if (isExpected) {
            label.classList.add('correct');
          }
        });
        if (answered) {
          for (var k in expected) { if (!seen[k]) correct = false; }
        }
      } else {
        var correctIdx = qtype === 'single'
          ? parseInt(answer, 10)
          : (answer === 'true' ? 0 : 1);
        var checkedIdx = -1;
        labels.forEach(function(label, idx) {
          var input = label.querySelector('input');
          if (input.checked) { checkedIdx = idx; answered = true; }
          if (idx === correctIdx) label.classList.add('correct');
        });
        if (answered && checkedIdx !== correctIdx) {
          labels[checkedIdx].classList.add('incorrect');
        }
        correct = checkedIdx === correctIdx;
      }

      if (!answered) return 'unanswered';
      q.classList.add(correct ? 'answered-correct' : 'answered-incorrect');
      return correct ? 'correct' : 'incorrect';
    }

    function lockQuestion(q) {
      q.classList.add('graded');
      q.querySelectorAll('input').forEach(function(input) { input.disabled = true; });
      q.querySelectorAll('button').forEach(function(btn) {
        if (!btn.classList.contains('quiz-reveal')) btn.disabled = true;
      });
      var reveal = q.querySelector('.quiz-reveal');
      if (reveal) reveal.hidden = true;
    }

    function showResult() {
      if (!resultEl) return;
      var correct = 0;
      var unanswered = 0;
      var byType = {};
      questions.forEach(function(q) {
        var r = q.getAttribute('data-result');
        var t = q.getAttribute('data-qtype') || '?';
        if (!byType[t]) byType[t] = { c: 0, n: 0 };
        byType[t].n++;
        if (r === 'correct') { correct++; byType[t].c++; }
        else if (r === 'unanswered') unanswered++;
      });
      var total = questions.length;
      var pct = total ? Math.round((correct / total) * 100) : 0;
      var stats = saveStats(quizId, correct, total);
      var parts = [];
      for (var t in byType) parts.push(t + ' ' + byType[t].c + '/' + byType[t].n);
      resultEl.innerHTML =
        '<div class="quiz-score">Correct ' + correct + '/' + total + ' — ' + pct + '%' + (unanswered ? ' · ' + unanswered + ' unanswered' : '') + '</div>' +
        '<div class="quiz-breakdown">' + parts.join(' · ') + '</div>' +
        '<div class="quiz-history">' + attemptsLabel(stats) + '</div>';
      resultEl.hidden = false;
    }

    function finishAttempt() {
      questions.forEach(function(q) {
        q.setAttribute('data-result', gradeQuestion(q));
        lockQuestion(q);
      });
      if (checkBtn) checkBtn.hidden = true;
      if (resetBtn) resetBtn.hidden = false;
      showResult();
      updateProgress();
    }

    if (checkBtn) {
      checkBtn.addEventListener('click', function() {
        if (mode !== 'exam') return;
        finishAttempt();
      });
    }

    // Practice mode: per-question check buttons grade one question at a time.
    questions.forEach(function(q) {
      var practiceBtn = q.querySelector('.quiz-practice-check');
      if (practiceBtn) {
        practiceBtn.addEventListener('click', function() {
          if (q.classList.contains('graded')) return;
          q.setAttribute('data-result', gradeQuestion(q));
          lockQuestion(q);
          var allGraded = questions.every(function(qq) { return qq.classList.contains('graded'); });
          if (allGraded) {
            if (resetBtn) resetBtn.hidden = false;
            showResult();
          }
          updateProgress();
        });
      }
    });

    // Self-check: reveal model answer, then let the user self-report.
    questions.forEach(function(q) {
      if (q.getAttribute('data-qtype') !== 'self-check') return;
      var reveal = q.querySelector('.quiz-reveal');
      var model = q.querySelector('.quiz-model-answer');
      var selfMark = q.querySelector('.quiz-self-mark');
      if (reveal) {
        reveal.addEventListener('click', function() {
          if (model) model.hidden = false;
          if (selfMark) selfMark.hidden = false;
          reveal.hidden = true;
        });
      }
      if (selfMark) {
        selfMark.querySelectorAll('button[data-mark]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            q.setAttribute('data-marked', btn.getAttribute('data-mark'));
            selfMark.querySelectorAll('button').forEach(function(b) { b.classList.remove('selected'); });
            btn.classList.add('selected');
            updateProgress();
            // In practice mode a self-mark resolves the question immediately.
            if (mode === 'practice' && !q.classList.contains('graded')) {
              q.setAttribute('data-result', gradeQuestion(q));
              lockQuestion(q);
              var allGraded = questions.every(function(qq) { return qq.classList.contains('graded'); });
              if (allGraded) {
                if (resetBtn) resetBtn.hidden = false;
                showResult();
              }
              updateProgress();
            }
          });
        });
      }
    });

    quiz.addEventListener('change', function(e) {
      if (e.target && e.target.matches && e.target.matches('.quiz-option input')) {
        updateProgress();
      }
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        questions.forEach(function(q) {
          q.classList.remove('graded', 'answered-correct', 'answered-incorrect');
          q.removeAttribute('data-result');
          q.removeAttribute('data-marked');
          q.querySelectorAll('input').forEach(function(input) {
            input.checked = false;
            input.disabled = false;
          });
          q.querySelectorAll('button').forEach(function(btn) { btn.disabled = false; });
          q.querySelectorAll('.quiz-option').forEach(function(label) {
            label.classList.remove('correct', 'incorrect');
          });
          q.querySelectorAll('.quiz-explanation, .quiz-model-answer, .quiz-self-mark').forEach(function(el) {
            el.hidden = true;
          });
          var reveal = q.querySelector('.quiz-reveal');
          if (reveal) reveal.hidden = false;
          q.querySelectorAll('.quiz-self-mark button').forEach(function(btn) {
            btn.classList.remove('selected');
          });
        });
        if (resultEl) { resultEl.hidden = true; resultEl.innerHTML = ''; }
        resetBtn.hidden = true;
        if (checkBtn && mode === 'exam') checkBtn.hidden = false;
        updateProgress();
      });
    }
  });
}

// Initialize sidebar toggle on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    initSidebarState();
    initSidebarToggle();
    updateContentViewToggle();
    initMermaidToolbars();
    initCodeBlockToolbars();
    initTableToolbars();
    initQuizzes();
  });
} else {
  initSidebarState();
  initSidebarToggle();
  updateContentViewToggle();
  initMermaidToolbars();
  initCodeBlockToolbars();
  initTableToolbars();
  initQuizzes();
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

function withBasePath(
  href: string,
  settings: Settings,
  isStaticExport?: boolean,
): string {
  if (!isStaticExport) return href;
  const basePath = settings.generate.basePath || "";
  if (!basePath) return href;
  const normalizedBase = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;
  return normalizedBase + href;
}

/**
 * Normalize a configured asset path (favicon, logo) so that a bare file
 * name like `favicon.svg` becomes root-relative `/favicon.svg`. Absolute
 * and protocol-relative URLs pass through unchanged.
 */
function normalizeAssetPath(pathOrUrl: string): string {
  if (/^(https?:)?\/\//i.test(pathOrUrl)) return pathOrUrl;
  return pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
}

function renderBreadcrumbs(
  urlPath: string,
  settings: Settings,
  isStaticExport?: boolean,
): string {
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
    return `<a href="${withBasePath(`${accum}/`, settings, isStaticExport)}">${escapeHtml(label)}</a>`;
  });

  return `<nav class="breadcrumbs">
    <a href="${withBasePath("/", settings, isStaticExport)}">Home</a>
    ${links.length > 0 ? '<span class="breadcrumb-sep">/</span>' + links.join('<span class="breadcrumb-sep">/</span>') : ""}
  </nav>`;
}

function humanize(str: string): string {
  return str
    .replace(/^\d+\./, "")
    .replace(/[-_]/g, " ")
    .replace(/\.\w+$/, "")
    .trim()
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

.search-trigger, .theme-toggle, .view-toggle, .sidebar-toggle {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  height: 36px;
  padding: 0 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-trigger:hover, .theme-toggle:hover, .view-toggle:hover, .sidebar-toggle:hover,
.search-trigger:focus-visible, .theme-toggle:focus-visible, .view-toggle:focus-visible, .sidebar-toggle:focus-visible {
  border-color: var(--accent);
  color: var(--text);
}

.view-icon-wide {
  display: none;
}

:root[data-content-view="wide"] .view-icon-contained {
  display: none;
}

:root[data-content-view="wide"] .view-icon-wide {
  display: flex;
}

.sidebar-toggle {
  font-size: 18px;
  padding: 6px 10px;
}

.sidebar-toggle-mobile {
  display: none;
}

.sidebar-toggle-desktop {
  display: flex;
}

@media (max-width: 768px) {
  .sidebar-toggle-mobile {
    display: flex;
  }
  .sidebar-toggle-desktop,
  .view-toggle {
    display: none;
  }
}

@media (min-width: 769px) {
  body.sidebar-collapsed .sidebar {
    transform: translateX(-100%);
  }

  body.sidebar-collapsed .content {
    margin-left: 0;
    max-width: 100%;
  }
}

@media (min-width: 1025px) {
  body.sidebar-collapsed .has-toc .content {
    max-width: calc(100% - var(--toc-width));
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
  transition: transform 0.25s ease;
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
  margin-left: 14px;
  border-left: 1px solid var(--border);
  padding-left: 0;
}

.nav-children[data-expanded="false"] {
  display: none;
}

.nav-item-header {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.nav-toggle {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.nav-toggle svg {
  transition: transform 0.2s;
}

.nav-toggle:hover {
  color: var(--text);
}

.nav-item-header[data-expanded="true"] .nav-toggle svg {
  transform: rotate(90deg);
}


.content {
  flex: 1;
  min-width: 0;
  margin-left: var(--sidebar-width);
  padding: 32px 48px;
  max-width: calc(100% - var(--sidebar-width));
  transition: margin-left 0.25s ease, max-width 0.25s ease;
}

.content > * {
  width: 100%;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

:root[data-content-view="wide"] .content > * {
  max-width: none;
}

@media (min-width: 1025px) {
  .has-toc .content {
    max-width: calc(100% - var(--sidebar-width) - var(--toc-width));
  }
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
  background: var(--code-inline-bg, var(--code-bg));
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
.callout,
.quiz-explanation,
.quiz-model-answer,
.quiz-option.correct,
.quiz-option.incorrect,
.quiz-error {
  --code-inline-bg: rgba(175, 184, 193, 0.4);
}
[data-theme="dark"] .callout,
[data-theme="dark"] .quiz-explanation,
[data-theme="dark"] .quiz-model-answer,
[data-theme="dark"] .quiz-option.correct,
[data-theme="dark"] .quiz-option.incorrect,
[data-theme="dark"] .quiz-error {
  --code-inline-bg: rgba(110, 118, 129, 0.4);
}

/* Code block wrapper */
.code-block-wrapper {
  display: block;
  margin-bottom: 16px;
}
.code-block-container {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
}
.code-block-container pre {
  background: var(--code-bg);
  border-radius: 6px;
  padding: 16px;
  overflow: auto;
  line-height: 1.45;
  margin: 0;
}
.code-block-container pre code {
  background: transparent;
  padding: 0;
  border-radius: 0;
}
.code-block-toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
}
.code-block-container:hover .code-block-toolbar {
  opacity: 1;
}
.code-block-btn {
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
.code-block-btn:hover {
  color: var(--text);
  border-color: var(--accent);
  background: var(--bg-secondary);
}
.code-block-btn.active {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--bg-secondary);
}
.code-block-container.wrap pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow: visible;
}
/* Code block fullscreen */
.code-block-container.fullscreen {
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
  background: var(--bg);
  display: flex;
  flex-direction: column;
}
.code-block-container.fullscreen .code-block-toolbar {
  opacity: 1;
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 0;
  border: none;
  background: transparent;
}
.code-block-container.fullscreen pre {
  flex: 1;
  border-radius: 0;
  padding: 24px;
  overflow: auto;
}
.markdown-body blockquote {
  margin: 0 0 16px;
  padding: 0 1em;
  color: var(--text-muted);
  border-left: 0.25em solid var(--border);
}
.markdown-body .table-wrapper {
  position: relative;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-bottom: 16px;
}
.table-toolbar {
  position: sticky;
  top: 0;
  left: 0;
  display: flex;
  justify-content: flex-end;
  min-width: 100%;
  padding-bottom: 4px;
  background: var(--bg);
  z-index: 2;
}
.table-btn-fullscreen {
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
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s, color 0.15s, border-color 0.15s, background 0.15s;
}
.table-wrapper:hover .table-btn-fullscreen,
.table-wrapper:focus-within .table-btn-fullscreen,
.table-wrapper.fullscreen .table-btn-fullscreen {
  opacity: 1;
  pointer-events: auto;
}
.table-btn-fullscreen:hover,
.table-btn-fullscreen:focus-visible {
  color: var(--text);
  border-color: var(--accent);
  background: var(--bg-secondary);
}
.markdown-body .table-wrapper.fullscreen {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 16px;
  overflow: auto;
  background: var(--code-bg);
  z-index: 9999;
}
.table-wrapper.fullscreen .table-toolbar {
  padding-bottom: 12px;
  background: transparent;
}
.table-wrapper.fullscreen .table-btn-fullscreen {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--bg-secondary);
}
.table-wrapper.fullscreen table {
  background: var(--bg);
}
.markdown-body table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 0;
}
.markdown-body th, .markdown-body td {
  padding: 6px 13px;
  border: 1px solid var(--border);
}
.markdown-body th { background: var(--bg-secondary); font-weight: 600; white-space: nowrap; }
.markdown-body tr:nth-child(2n) { background: var(--bg-secondary); }

/* Directory listing (auto-index pages) */
.dir-listing table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}
.dir-listing th, .dir-listing td {
  padding: 8px 12px;
  text-align: left;
  border: none;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  white-space: normal;
}
.dir-listing th { font-weight: 600; color: var(--text-muted); }
.dir-listing tr { background: transparent; }
.dir-listing td a { color: var(--accent); text-decoration: none; }
.dir-listing td a:hover { text-decoration: underline; }
.dir-listing .size { color: var(--text-muted); text-align: right; width: 100px; }
.dir-listing .empty { color: var(--text-muted); font-style: italic; }
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

/* Prev/Next navigation */
.prev-next-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 48px;
  max-width: 800px;
}

.prev-next-card {
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  text-decoration: none;
  color: var(--text);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.prev-next-card:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  text-decoration: none;
}

.prev-next-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.prev-next-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent);
}

.next-card {
  text-align: right;
  align-items: flex-end;
}

@media (max-width: 640px) {
  .prev-next-nav {
    grid-template-columns: 1fr;
  }
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

/* Math expressions (KaTeX) */
.math-block {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 8px 0;
  margin-bottom: 16px;
}
.markdown-body .katex {
  font-size: 1.1em;
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

/* Quiz */
.quiz {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-secondary);
  padding: 16px;
  margin-bottom: 16px;
}
.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.quiz-title {
  font-weight: 600;
}
.quiz-progress {
  font-size: 13px;
  color: var(--text-muted);
  white-space: nowrap;
}
.quiz-question {
  padding: 12px 0;
  border-top: 1px solid var(--border);
}
.quiz-question-text {
  margin-bottom: 8px;
}
.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.quiz-option {
  display: block;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  cursor: pointer;
}
.quiz-option:hover {
  border-color: var(--accent);
}
.quiz-option input {
  accent-color: var(--accent);
}
.quiz-option.correct {
  border-color: #1a7f37;
  background: #dafbe1;
}
.quiz-option.incorrect {
  border-color: #cf222e;
  background: #ffebe9;
}
[data-theme="dark"] .quiz-option.correct {
  border-color: #3fb950;
  background: #0f2616;
}
[data-theme="dark"] .quiz-option.incorrect {
  border-color: #f85149;
  background: #3c0e0e;
}
.quiz-question.graded .quiz-option {
  cursor: default;
}
.quiz-question.graded .quiz-option:hover {
  border-color: var(--border);
}
.quiz-question.graded .quiz-option.correct:hover {
  border-color: #1a7f37;
}
.quiz-question.graded .quiz-option.incorrect:hover {
  border-color: #cf222e;
}
[data-theme="dark"] .quiz-question.graded .quiz-option.correct:hover {
  border-color: #3fb950;
}
[data-theme="dark"] .quiz-question.graded .quiz-option.incorrect:hover {
  border-color: #f85149;
}
.quiz-explanation,
.quiz-model-answer {
  border-left: 4px solid #0969da;
  background: #ddf4ff;
  border-radius: 4px;
  padding: 10px 14px;
  margin-top: 8px;
  font-size: 14px;
}
[data-theme="dark"] .quiz-explanation,
[data-theme="dark"] .quiz-model-answer {
  border-color: #58a6ff;
  background: #0c1c38;
}
.quiz-practice-check,
.quiz-reveal {
  margin-top: 8px;
}
.quiz-self-mark {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.quiz-self-mark button.selected {
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
.quiz-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.quiz button {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.quiz button:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.quiz button:disabled {
  opacity: 0.6;
  cursor: default;
}
.quiz button.quiz-check {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.quiz button.quiz-check:hover:not(:disabled) {
  color: #fff;
  opacity: 0.9;
}
.quiz-result {
  margin-top: 12px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent);
  border-radius: 6px;
  background: var(--bg);
}
.quiz-score {
  font-weight: 600;
  font-size: 16px;
}
.quiz-breakdown,
.quiz-history {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}
.quiz-error {
  border-left: 4px solid #cf222e;
  background: #ffebe9;
}
[data-theme="dark"] .quiz-error {
  border-color: #f85149;
  background: #3c0e0e;
}
.quiz-error strong {
  display: block;
  margin-bottom: 4px;
}

/* Mermaid wrapper */
.mermaid-wrapper {
  display: block;
  margin-bottom: 16px;
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
}
.mermaid-chart .mermaid svg {
  max-width: 100%;
  height: auto;
  transform-origin: center center;
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
}


/* Responsive */
@media (max-width: 1024px) {
  .toc-sidebar {
    display: none;
  }
  .content,
  .has-toc .content {
    max-width: calc(100% - var(--sidebar-width));
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
  .content,
  .has-toc .content {
    margin-left: 0;
    max-width: 100%;
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
