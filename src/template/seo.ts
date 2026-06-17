import type { Settings } from "../settings/index.js";

export interface SeoData {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  date?: string;
  author?: string;
  noIndex?: boolean;
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

function resolveImageUrl(image: string, settings: Settings): string {
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  if (settings.site.baseUrl) {
    const base = settings.site.baseUrl.replace(/\/$/, "");
    const path = image.startsWith("/") ? image : `/${image}`;
    return `${base}${path}`;
  }
  return image;
}

export function buildSeoTags(data: SeoData, settings: Settings): string {
  const title = settings.seo.titleTemplate.replace("%s", data.title);
  const image = data.image ?? settings.seo.defaultImage;
  const description = data.description ?? settings.site.description ?? "";

  const tags: string[] = [];

  // Basic meta
  tags.push(`<title>${escapeHtml(title)}</title>`);
  tags.push(`<meta name="description" content="${escapeHtml(description)}">`);

  if (data.noIndex || settings.seo.noIndex) {
    tags.push('<meta name="robots" content="noindex">');
  }

  // Open Graph
  tags.push(`<meta property="og:title" content="${escapeHtml(title)}">`);
  tags.push(
    `<meta property="og:description" content="${escapeHtml(description)}">`,
  );
  tags.push(`<meta property="og:type" content="${data.type ?? "website"}">`);

  if (data.url) {
    tags.push(`<meta property="og:url" content="${data.url}">`);
  }

  if (image) {
    tags.push(
      `<meta property="og:image" content="${resolveImageUrl(image, settings)}">`,
    );
  }

  // Twitter Card
  tags.push(`<meta name="twitter:card" content="${settings.seo.twitterCard}">`);

  if (settings.seo.twitterSite) {
    tags.push(
      `<meta name="twitter:site" content="${settings.seo.twitterSite}">`,
    );
  }

  tags.push(`<meta name="twitter:title" content="${escapeHtml(title)}">`);

  if (image) {
    tags.push(
      `<meta name="twitter:image" content="${resolveImageUrl(image, settings)}">`,
    );
  }

  // Article meta
  if (data.date) {
    tags.push(
      `<meta property="article:published_time" content="${data.date}">`,
    );
  }

  if (data.author) {
    tags.push(`<meta property="article:author" content="${data.author}">`);
  }

  // Canonical & Sitemap
  if (data.url && settings.site.baseUrl) {
    tags.push(`<link rel="canonical" href="${data.url}">`);
  }

  if (settings.seo.generateSitemap) {
    const basePath = settings.site.basePath || "";
    tags.push(
      `<link rel="sitemap" type="application/xml" href="${basePath}/sitemap.xml">`,
    );
  }

  if (settings.seo.generateRssFeed) {
    const basePath = settings.site.basePath || "";
    tags.push(
      `<link rel="alternate" type="application/rss+xml" href="${basePath}/feed.xml">`,
    );
  }

  return tags.join("\n    ");
}
