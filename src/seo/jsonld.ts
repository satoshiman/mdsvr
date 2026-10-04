import type { Settings } from "../settings/index.js";
import type { SeoData } from "./metadata.js";
import { buildPageUrl, buildSiteUrl, toAbsoluteAssetUrl } from "./url.js";

/**
 * Build the JSON-LD `<script>` tag for a page.
 *
 * - Homepage → `WebSite`
 * - Document pages → `Article`
 * - Nested routes → `BreadcrumbList`
 *
 * Fields are only emitted when real data exists (no invented dates).
 * Returns an empty string when `seo.structuredData` is off or there is
 * nothing worth emitting.
 */
export function buildJsonLd(seo: SeoData, settings: Settings): string {
  if (!settings.seo.structuredData) return "";

  const graph: Record<string, unknown>[] = [];

  if (seo.kind !== "generic" && seo.urlPath === "/") {
    const site: Record<string, unknown> = {
      "@type": "WebSite",
      name: settings.site.title || seo.title,
    };
    const url = buildSiteUrl(settings);
    if (url) site.url = url;
    const description = seo.description || settings.site.description;
    if (description) site.description = description;
    graph.push(site);
  } else if (seo.kind === "document" && seo.type === "article") {
    const article: Record<string, unknown> = {
      "@type": "Article",
      headline: seo.title,
    };
    if (seo.description) article.description = seo.description;
    if (seo.absoluteUrl) article.url = seo.absoluteUrl;
    if (seo.image) {
      const image = toAbsoluteAssetUrl(seo.image, settings);
      if (image) article.image = image;
    }
    if (seo.author) {
      article.author = {
        "@type": seo.author.type,
        name: seo.author.name,
        ...(seo.author.url ? { url: seo.author.url } : {}),
      };
    }
    if (seo.datePublished) article.datePublished = seo.datePublished;
    if (seo.dateModified) article.dateModified = seo.dateModified;
    graph.push(article);
  }

  if (seo.breadcrumbs.length > 1) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: seo.breadcrumbs.map((crumb, i) => {
        const item: Record<string, unknown> = {
          "@type": "ListItem",
          position: i + 1,
          name: crumb.name,
        };
        const url = buildPageUrl(crumb.urlPath, settings);
        if (url) item.item = url;
        return item;
      }),
    });
  }

  if (graph.length === 0) return "";

  // `<\/` escaping prevents a literal `</script>` from breaking the tag.
  const json = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph,
  }).replace(/<\//g, "<\\/");

  return `<script type="application/ld+json">${json}</script>`;
}
