import type { Settings } from "../settings/index.js";

/**
 * Normalize a documentation route to its canonical form:
 * leading `/`, trailing `/`, index/readme file names collapsed to the
 * directory URL, `.md`/`.mdx` extensions stripped, `index.html` collapsed,
 * and every path segment percent-encoded.
 */
export function normalizeUrlPath(urlPath: string): string {
  let p = (urlPath || "/").split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = `/${p}`;

  const segments = p.split("/").filter((s) => s.length > 0 && s !== ".");
  const last = segments[segments.length - 1];
  if (last) {
    if (/^(readme|index)\.(md|mdx|html)$/i.test(last)) {
      segments.pop();
    } else if (/\.(md|mdx)$/i.test(last)) {
      segments[segments.length - 1] = last.replace(/\.(md|mdx)$/i, "");
    }
  }

  const encoded = segments.map((s) => encodeURIComponent(s));
  return `/${encoded.join("/")}${encoded.length ? "/" : ""}`;
}

/** Normalize `generate.basePath` to `"/base"` form (empty when unset). */
export function normalizeBasePath(basePath: string | undefined): string {
  const bp = (basePath || "").trim();
  if (!bp || bp === "/") return "";
  return `/${bp.replace(/^\/+|\/+$/g, "")}`;
}

function resolveBase(settings: Settings, origin?: string): string {
  return (settings.site.baseUrl || origin || "").replace(/\/+$/, "");
}

/**
 * Build the absolute URL for a documentation route.
 * Returns `null` when no absolute base is available (`site.baseUrl`
 * or an explicit request `origin`).
 */
export function buildPageUrl(
  urlPath: string,
  settings: Settings,
  origin?: string,
): string | null {
  const base = resolveBase(settings, origin);
  if (!base) return null;
  return `${base}${normalizeBasePath(settings.generate.basePath)}${normalizeUrlPath(urlPath)}`;
}

/** Absolute site root URL (baseUrl + basePath + `/`), or `null`. */
export function buildSiteUrl(settings: Settings, origin?: string): string | null {
  const base = resolveBase(settings, origin);
  if (!base) return null;
  return `${base}${normalizeBasePath(settings.generate.basePath)}/`;
}

/**
 * Resolve an image/asset reference to an absolute URL.
 * Absolute http(s) URLs pass through. Site-relative paths are resolved
 * against `site.baseUrl` + `generate.basePath` (a path that already starts
 * with basePath is not prefixed twice). Returns `null` when the input is a
 * relative path and no absolute base is configured.
 */
export function toAbsoluteAssetUrl(
  pathOrUrl: string,
  settings: Settings,
  origin?: string,
): string | null {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const siteUrl = buildSiteUrl(settings, origin);
  if (!siteUrl) return null;

  let p = pathOrUrl.replace(/^\.\//, "").replace(/^\/+/, "");
  const bp = normalizeBasePath(settings.generate.basePath).replace(/^\//, "");
  if (bp && p.startsWith(`${bp}/`)) p = p.slice(bp.length + 1);

  const encoded = p
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${siteUrl}${encoded}`;
}
