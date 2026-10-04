import type { Settings } from "../settings/index.js";
import type { NavItem } from "../template/sidebar.js";
import { getOgImageUrl } from "../og/index.js";
import { OG_WIDTH, OG_HEIGHT } from "../og/template.js";
import { extractFirstParagraph } from "./extract.js";
import { buildPageUrl, normalizeBasePath, normalizeUrlPath } from "./url.js";

export type PageKind = "document" | "directory" | "generic";

export interface SeoAuthor {
  name: string;
  url?: string;
  type: "Person" | "Organization";
}

export interface SeoBreadcrumb {
  name: string;
  urlPath: string;
}

export interface SeoData {
  /** Resolved page title (before `seo.titleTemplate`). */
  title: string;
  description?: string;
  image?: string;
  /** Explicit `imageAlt` frontmatter; callers fall back to the page title. */
  imageAlt?: string;
  /** Pixel dimensions, set only for generated OG images (known size). */
  imageWidth?: number;
  imageHeight?: number;
  /** Absolute canonical URL, or null when no `site.baseUrl` is configured. */
  absoluteUrl: string | null;
  /** Normalized trailing-slash route. */
  urlPath: string;
  type: "website" | "article";
  kind: PageKind;
  datePublished?: string;
  dateModified?: string;
  author?: SeoAuthor;
  noIndex: boolean;
  /** Home → ancestors → current page (empty when disabled or at root). */
  breadcrumbs: SeoBreadcrumb[];
  /** Root-relative sitemap URL, or null when it should not be advertised. */
  sitemapUrl: string | null;
}

export interface ResolveSeoInput {
  frontmatter?: Record<string, unknown>;
  /** Raw markdown/MDX source for description auto-extraction. */
  content?: string;
  /** Display title resolved by the caller (frontmatter → H1 → filename). */
  title: string;
  urlPath?: string;
  kind?: PageKind;
  settings: Settings;
  sidebar?: NavItem[];
  isStaticExport?: boolean;
  /**
   * Source-file dates used as fallbacks when frontmatter omits
   * `date`/`datePublished`/`dateModified` (birthtime/mtime from the caller).
   */
  fileDates?: { published?: Date; modified?: Date };
}

function str(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  return s || undefined;
}

function toIsoDate(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().split("T")[0];
}

function resolveAuthor(author: unknown): SeoAuthor | undefined {
  if (typeof author === "string") {
    const name = author.trim();
    return name ? { name, type: "Person" } : undefined;
  }
  if (author && typeof author === "object") {
    const obj = author as Record<string, unknown>;
    const name = str(obj.name);
    if (!name) return undefined;
    const type = obj.type === "Organization" ? "Organization" : "Person";
    return { name, url: str(obj.url), type };
  }
  return undefined;
}

function humanizeSegment(segment: string): string {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // Keep the raw segment when it is not valid percent-encoding
  }
  return decoded
    .replace(/^\d+\./, "")
    .replace(/[-_]/g, " ")
    .replace(/\.\w+$/, "")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function findNavTitle(items: NavItem[], urlPath: string): string | undefined {
  const target = urlPath.replace(/\/+$/, "") || "/";
  for (const item of items) {
    const href = item.href.replace(/\/+$/, "") || "/";
    if (href === target) return item.title;
    if (item.children) {
      const found = findNavTitle(item.children, urlPath);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Apply `seo.titleTemplate` to a page title. When the template is unset,
 * defaults to `"<title> | <site title>"` (or the bare title when the site
 * has no title).
 */
export function formatPageTitle(pageTitle: string, settings: Settings): string {
  if (settings.seo.titleTemplate != null) {
    return settings.seo.titleTemplate.replace("%s", pageTitle);
  }
  // Default: "<title> | <site title>"; skip the suffix when it would
  // duplicate the site title (e.g. homepage H1 == site.title).
  if (
    !settings.site.title ||
    pageTitle.trim().toLowerCase() === settings.site.title.trim().toLowerCase()
  ) {
    return pageTitle;
  }
  return `${pageTitle} | ${settings.site.title}`;
}

/**
 * Resolve all SEO metadata for a page from frontmatter, content, and
 * settings. Centralizes the frontmatter → extracted → site-defaults chain
 * so templates and generators share one source of truth.
 */
export function resolveSeoData(input: ResolveSeoInput): SeoData {
  const {
    frontmatter = {},
    content = "",
    title,
    settings,
    sidebar = [],
    isStaticExport = false,
  } = input;
  const kind = input.kind ?? "document";
  const urlPath = normalizeUrlPath(input.urlPath ?? "/");

  const resolvedTitle = str(frontmatter.seoTitle) ?? title;

  const description =
    str(frontmatter.description) ??
    (content ? extractFirstParagraph(content) : null) ??
    (settings.site.description || undefined);

  const isHome = urlPath === "/";
  const type: SeoData["type"] =
    kind === "document" && !isHome ? "article" : "website";

  let image = str(frontmatter.image);
  let generatedOg = false;
  if (!image && isStaticExport && settings.seo.og?.enabled) {
    image = getOgImageUrl(
      urlPath,
      settings.generate.basePath || "",
      settings.seo.og.imageFormat,
    );
    generatedOg = true;
  }
  image ??= settings.seo.defaultImage;

  const author =
    resolveAuthor(frontmatter.author) ??
    (settings.site.author?.name
      ? {
          name: settings.site.author.name,
          url: settings.site.author.url,
          type: "Organization" as const,
        }
      : undefined);

  const breadcrumbs: SeoBreadcrumb[] = [];
  if (settings.navigation.breadcrumbs && !isHome && kind !== "generic") {
    breadcrumbs.push({ name: "Home", urlPath: "/" });
    const segments = urlPath.split("/").filter(Boolean);
    let acc = "";
    segments.forEach((segment, i) => {
      acc += `/${segment}`;
      const isLast = i === segments.length - 1;
      const name = isLast
        ? resolvedTitle
        : (findNavTitle(sidebar, acc) ?? humanizeSegment(segment));
      breadcrumbs.push({ name, urlPath: `${acc}/` });
    });
  }

  const sitemapUrl =
    settings.seo.generateSitemap && !(isStaticExport && !settings.site.baseUrl)
      ? `${normalizeBasePath(settings.generate.basePath)}/sitemap.xml`
      : null;

  return {
    title: resolvedTitle,
    description,
    image,
    imageAlt: str(frontmatter.imageAlt),
    imageWidth: generatedOg ? OG_WIDTH : undefined,
    imageHeight: generatedOg ? OG_HEIGHT : undefined,
    absoluteUrl: buildPageUrl(urlPath, settings),
    urlPath,
    type,
    kind,
    datePublished: toIsoDate(
      frontmatter.datePublished ??
        frontmatter.date ??
        input.fileDates?.published,
    ),
    dateModified: toIsoDate(
      frontmatter.dateModified ??
        frontmatter.updated ??
        frontmatter.lastmod ??
        input.fileDates?.modified,
    ),
    author,
    noIndex:
      (frontmatter.noindex ?? frontmatter.noIndex) === true ||
      (kind === "directory" && settings.seo.noIndexDirectoryPages),
    breadcrumbs,
    sitemapUrl,
  };
}
