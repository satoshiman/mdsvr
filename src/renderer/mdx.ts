import { compile, run } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import type { Settings } from "../settings/index.js";
import { builtinComponents } from "./components.js";

// Convert triple-colon callouts in HTML to callout divs
function convertTripleColonCallouts(html: string): string {
  const typeMap: Record<string, string> = {
    NOTE: "info",
    TIP: "tip",
    IMPORTANT: "info",
    WARNING: "warning",
    CAUTION: "danger",
    INFO: "info",
    DANGER: "danger",
  };

  const titles: Record<string, string> = {
    NOTE: "ℹ️ Info",
    TIP: "💡 Tip",
    IMPORTANT: "ℹ️ Info",
    WARNING: "⚠️ Warning",
    CAUTION: "🚫 Danger",
    INFO: "ℹ️ Info",
    DANGER: "🚫 Danger",
  };

  // Match triple-colon syntax: :::type content :::
  return html.replace(
    /<p>\s*:::(note|tip|warning|danger|info|important|caution)\s*(.*?)\s*:::\s*<\/p>/gis,
    (match, type, content) => {
      const calloutType = typeMap[type.toUpperCase()] || "info";
      const calloutTitle = titles[type.toUpperCase()] || "ℹ️ Info";
      return `<div class="callout callout-${calloutType}"><strong style="display: block; margin-bottom: 8px;">${calloutTitle}</strong><div>${content}</div></div>`;
    },
  );
}

export interface TocItem {
  level: number;
  text: string;
  slug: string;
  children?: TocItem[];
}

export interface MdxRenderResult {
  html: string;
  frontmatter: Record<string, unknown>;
  toc: TocItem[];
}

export async function renderMdx(
  content: string,
  settings: Settings,
): Promise<MdxRenderResult> {
  if (!settings.mdx.enabled) {
    throw new Error("MDX is disabled in settings");
  }

  const compiled = await compile(content, {
    outputFormat: "function-body",
    remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMdxFrontmatter],
    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
    development: false,
  });

  // Execute compiled MDX in Node.js
  const result = await run(String(compiled), {
    ...runtime,
    baseUrl: import.meta.url,
  });

  const MDXContent = result.default;
  const frontmatter = (result.frontmatter as Record<string, unknown>) ?? {};

  // Filter enabled components based on settings
  const enabledComponents: Record<string, React.ComponentType<unknown>> = {};
  for (const [name, component] of Object.entries(builtinComponents)) {
    const componentKey = name as keyof typeof settings.mdx.components;
    if (settings.mdx.components[name] !== false) {
      enabledComponents[name] = component as React.ComponentType<unknown>;
    }
  }

  // Render to static HTML with built-in components injected
  let html = renderToStaticMarkup(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (MDXContent as any)({ components: enabledComponents }),
  );

  // Convert triple-colon callouts
  html = convertTripleColonCallouts(html);

  const toc = extractToc(html);

  return { html, frontmatter, toc };
}

function extractToc(html: string): TocItem[] {
  const toc: TocItem[] = [];
  // Match heading tags with id attributes
  const regex = /<h([1-6])[^>]*id="([^"]+)"[^>]*>([^<]*)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const slug = match[2];
    const text = match[3].replace(/<[^>]*>/g, ""); // strip any inline tags
    toc.push({ level, text, slug });
  }
  return toc;
}
