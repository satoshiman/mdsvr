import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { normalizeUrlPath } from "./seo/url.js";

export type ResolvedLinkKind = "doc" | "asset" | "missing";

export interface LinkTransformContext {
  /**
   * URL path of the directory containing the source file,
   * e.g. "/guide" or "/" for a root-level file.
   */
  sourceDirUrlPath: string;
  /** Absolute filesystem path of the docs root. */
  rootDir: string;
  /** Classify an absolute filesystem path inside the docs root. */
  resolveFile: (absSourcePath: string) => ResolvedLinkKind;
}

export interface LinkWarning {
  /** The original URL as written in the source. */
  url: string;
  /** The resolved site-relative route (for diagnostics). */
  resolvedUrlPath: string;
  reason: "missing" | "outside-root";
}

export interface LinkTransformResult {
  html: string;
  warnings: LinkWarning[];
}

function isExternalOrSpecial(url: string): boolean {
  // Anchor-only, query-only, protocol-relative, absolute URLs, and any
  // scheme-prefixed URL (mailto:, tel:, data:, javascript:, ...) stay as-is.
  if (url.startsWith("#") || url.startsWith("?")) return true;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("//")
  ) {
    return true;
  }
  return /^[a-z]+:/i.test(url);
}

function stripMarkdownExt(url: string): string {
  return url.replace(/\.(md|mdx)(?=[?#]|$)/i, "");
}

/** Split `?query`/`#anchor` suffix off a URL path. */
function splitUrlSuffix(url: string): { pathPart: string; suffix: string } {
  const idx = url.search(/[?#]/);
  if (idx === -1) return { pathPart: url, suffix: "" };
  return { pathPart: url.slice(0, idx), suffix: url.slice(idx) };
}

function decodeUrlPath(p: string): string {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
}

/** Percent-encode every path segment (leading `/` is preserved). */
function encodeUrlPath(p: string): string {
  return p.split("/").map(encodeURIComponent).join("/");
}

function isWithinRoot(rootDir: string, absPath: string): boolean {
  const rel = path.relative(rootDir, absPath);
  return (
    rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel)
  );
}

/**
 * Filesystem-backed link resolver shared by static export and `cleanUrls`
 * serve mode, so both produce identical output.
 */
export function createLinkResolver(): (absPath: string) => ResolvedLinkKind {
  return (absPath: string): ResolvedLinkKind => {
    try {
      const st = statSync(absPath);
      // Directories resolve to an index page or an auto-index listing
      if (st.isDirectory()) return "doc";
      return /\.(md|mdx)$/i.test(absPath) ? "doc" : "asset";
    } catch {
      // Path does not exist as-is
    }
    if (!/\.(md|mdx)$/i.test(absPath)) {
      if (existsSync(`${absPath}.md`) || existsSync(`${absPath}.mdx`)) {
        return "doc";
      }
    }
    return "missing";
  };
}

/**
 * Resolve one URL against the source file's directory and emit the canonical
 * site-relative route. Returns the original URL when the target cannot be
 * resolved (warnings are collected on the result instead).
 */
function rebaseUrl(
  url: string,
  ctx: LinkTransformContext,
  warnings: LinkWarning[],
): string {
  if (isExternalOrSpecial(url)) return url;

  const { pathPart, suffix } = splitUrlSuffix(url);
  if (!pathPart) return url;

  // Candidate site-relative route (decoded so filesystem lookup works)
  const decoded = decodeUrlPath(pathPart);
  const route = pathPart.startsWith("/")
    ? decoded
    : path.posix.resolve("/", ctx.sourceDirUrlPath, decoded);

  const absPath = path.resolve(ctx.rootDir, `.${route}`);
  if (!isWithinRoot(ctx.rootDir, absPath)) {
    warnings.push({ url, resolvedUrlPath: route, reason: "outside-root" });
    return url;
  }

  const kind = ctx.resolveFile(absPath);
  if (kind === "doc") return `${normalizeUrlPath(route)}${suffix}`;
  if (kind === "asset") return `${encodeUrlPath(route)}${suffix}`;

  warnings.push({ url, resolvedUrlPath: route, reason: "missing" });
  return url;
}

/**
 * Convert .md/.mdx links to clean URLs.
 *
 * Without a context, only `.md`/`.mdx` extensions are stripped (legacy
 * behavior). With a `LinkTransformContext`, every relative `href`/`src` is
 * rebased against the source file's directory and emitted as the canonical
 * site-relative route (trailing-slash form for doc pages), which fixes
 * relative links resolving one level too deep on exported clean-URL pages.
 *
 * Works on rendered HTML (`href`/`src` attributes) as well as raw markdown
 * `[text](url)` syntax.
 */
export function convertMarkdownLinks(
  html: string,
  ctx?: LinkTransformContext,
): LinkTransformResult {
  const warnings: LinkWarning[] = [];

  const rewrite = (url: string): string => {
    if (!ctx) {
      return isExternalOrSpecial(url) ? url : stripMarkdownExt(url);
    }
    return rebaseUrl(url, ctx, warnings);
  };

  // Rewrite HTML href/src/data-src/poster attributes
  let result = html.replace(
    /(?<![\w-])(href|src|data-src|poster)="([^"]+)"/g,
    (match, attr: string, url: string) => {
      const next = rewrite(url);
      return next === url ? match : `${attr}="${next}"`;
    },
  );

  // Match markdown links: [text](path) and [text](path#anchor)
  // Also match image links: ![text](path) - but we skip those.
  // Skip <pre>…</pre> regions: rendered code blocks may contain literal
  // markdown-link examples that must not be rewritten.
  const mdLinkRe = /(?<!\!)\[([^\]]+)\]\(([^)]+)\)/g;
  result = result
    .split(/(<pre[\s>][\s\S]*?<\/pre>)/i)
    .map((segment) =>
      /^<pre[\s>]/i.test(segment)
        ? segment
        : segment.replace(mdLinkRe, (match, text, url: string) => {
            const next = rewrite(url);
            return next === url ? match : `[${text}](${next})`;
          }),
    )
    .join("");

  return { html: result, warnings };
}
