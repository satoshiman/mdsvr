import type { Settings } from "../settings/index.js";
import { formatPageTitle, type SeoData } from "../seo/metadata.js";
import { normalizeBasePath, toAbsoluteAssetUrl } from "../seo/url.js";

export type { SeoData } from "../seo/metadata.js";

/**
 * Default territory per language (CLDR likely-subtags) used when
 * `site.language` is a bare code without a region.
 */
const DEFAULT_LOCALE_TERRITORY: Record<string, string> = {
  ar: "SA",
  bg: "BG",
  bn: "BD",
  ca: "ES",
  cs: "CZ",
  da: "DK",
  de: "DE",
  el: "GR",
  en: "US",
  es: "ES",
  et: "EE",
  eu: "ES",
  fa: "IR",
  fi: "FI",
  fil: "PH",
  fr: "FR",
  gl: "ES",
  he: "IL",
  hi: "IN",
  hr: "HR",
  hu: "HU",
  id: "ID",
  it: "IT",
  ja: "JP",
  ko: "KR",
  lt: "LT",
  lv: "LV",
  mr: "IN",
  ms: "MY",
  nb: "NO",
  nl: "NL",
  pa: "IN",
  pl: "PL",
  pt: "BR",
  ro: "RO",
  ru: "RU",
  sk: "SK",
  sl: "SI",
  sr: "RS",
  sv: "SE",
  sw: "TZ",
  ta: "IN",
  te: "IN",
  th: "TH",
  tr: "TR",
  uk: "UA",
  ur: "PK",
  vi: "VN",
  zh: "CN",
};

/**
 * Convert `site.language` to the Open Graph `language_TERRITORY` form:
 * `pt-BR`/`pt_br` → `pt_BR`, `zh-Hant-TW` → `zh_TW`; bare codes resolve a
 * default territory (`en` → `en_US`, `vi` → `vi_VN`) with an `xx_XX`
 * heuristic fallback for unlisted languages.
 */
function toOgLocale(language: string): string {
  const parts = language.trim().split(/[-_]/).filter(Boolean);
  if (parts.length === 0) return language.trim();
  const lang = parts[0].toLowerCase();
  const last = parts[parts.length - 1];
  if (parts.length > 1 && /^([a-zA-Z]{2}|\d{3})$/.test(last)) {
    return `${lang}_${last.toUpperCase()}`;
  }
  return `${lang}_${DEFAULT_LOCALE_TERRITORY[lang] ?? lang.toUpperCase()}`;
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

/**
 * Render the `<head>` SEO tags for a resolved page. All attribute values
 * (including URLs) are HTML-escaped. Canonical and `og:url` are only
 * emitted as absolute URLs — never relative.
 */
export function buildSeoTags(data: SeoData, settings: Settings): string {
  const title = formatPageTitle(data.title, settings);
  const description = data.description ?? "";
  const image = data.image
    ? (toAbsoluteAssetUrl(data.image, settings) ?? data.image)
    : undefined;

  const tags: string[] = [];

  // Basic meta
  tags.push(`<title>${escapeHtml(title)}</title>`);
  tags.push(`<meta name="description" content="${escapeHtml(description)}">`);

  if (data.noIndex || settings.seo.noIndex) {
    tags.push('<meta name="robots" content="noindex, nofollow">');
  }

  if (data.author) {
    tags.push(`<meta name="author" content="${escapeHtml(data.author.name)}">`);
  }

  // Canonical — absolute only, never relative
  if (data.absoluteUrl) {
    tags.push(`<link rel="canonical" href="${escapeHtml(data.absoluteUrl)}">`);
  }

  // Open Graph
  tags.push(`<meta property="og:title" content="${escapeHtml(title)}">`);
  tags.push(
    `<meta property="og:description" content="${escapeHtml(description)}">`,
  );
  tags.push(`<meta property="og:type" content="${data.type}">`);

  if (settings.site.title) {
    tags.push(
      `<meta property="og:site_name" content="${escapeHtml(settings.site.title)}">`,
    );
  }

  if (settings.site.language) {
    tags.push(
      `<meta property="og:locale" content="${escapeHtml(toOgLocale(settings.site.language))}">`,
    );
  }

  if (data.absoluteUrl) {
    tags.push(
      `<meta property="og:url" content="${escapeHtml(data.absoluteUrl)}">`,
    );
  }

  if (image) {
    tags.push(`<meta property="og:image" content="${escapeHtml(image)}">`);
    tags.push(
      `<meta property="og:image:alt" content="${escapeHtml(data.imageAlt ?? data.title)}">`,
    );
    if (data.imageWidth) {
      tags.push(
        `<meta property="og:image:width" content="${data.imageWidth}">`,
      );
    }
    if (data.imageHeight) {
      tags.push(
        `<meta property="og:image:height" content="${data.imageHeight}">`,
      );
    }
  }

  // Twitter Card
  tags.push(`<meta name="twitter:card" content="${settings.seo.twitterCard}">`);

  if (settings.seo.twitterSite) {
    tags.push(
      `<meta name="twitter:site" content="${escapeHtml(settings.seo.twitterSite)}">`,
    );
  }

  tags.push(`<meta name="twitter:title" content="${escapeHtml(title)}">`);
  tags.push(
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
  );

  if (image) {
    tags.push(`<meta name="twitter:image" content="${escapeHtml(image)}">`);
    tags.push(
      `<meta name="twitter:image:alt" content="${escapeHtml(data.imageAlt ?? data.title)}">`,
    );
  }

  // Article meta
  if (data.datePublished) {
    tags.push(
      `<meta property="article:published_time" content="${escapeHtml(data.datePublished)}">`,
    );
  }

  if (data.dateModified) {
    tags.push(
      `<meta property="article:modified_time" content="${escapeHtml(data.dateModified)}">`,
    );
  }

  if (data.author) {
    tags.push(
      `<meta property="article:author" content="${escapeHtml(data.author.name)}">`,
    );
  }

  // Sitemap & RSS
  if (data.sitemapUrl) {
    tags.push(
      `<link rel="sitemap" type="application/xml" href="${escapeHtml(data.sitemapUrl)}">`,
    );
  }

  if (settings.seo.generateRssFeed) {
    const basePath = normalizeBasePath(settings.generate.basePath);
    tags.push(
      `<link rel="alternate" type="application/rss+xml" href="${escapeHtml(`${basePath}/feed.xml`)}">`,
    );
  }

  return tags.join("\n    ");
}
