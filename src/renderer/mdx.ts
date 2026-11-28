import { compile, run, type CompileOptions } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import hljs from "highlight.js";
import type { Settings } from "../settings/index.js";
import { builtinComponents } from "./components.js";
import { extractToc, type TocItem } from "./toc.js";
import {
  convertGithubCallouts,
  renderCodeBlockWithToolbar,
  wrapTables,
} from "./markdown.js";

interface MdastNode {
  type: string;
  lang?: string;
  meta?: string;
  value?: string;
  name?: string;
  attributes?: Array<{
    type: string;
    name: string;
    value: unknown;
  }>;
  children?: MdastNode[];
}

// Transform ```quiz code fences into <Quiz source="..."> JSX elements so the
// shared quiz renderer handles MDX the same way markdown-it handles .md.
function remarkQuiz() {
  return (tree: MdastNode) => {
    const walk = (node: MdastNode) => {
      if (node.type === "code" && node.lang === "quiz") {
        node.type = "mdxJsxFlowElement";
        node.name = "Quiz";
        node.attributes = [
          { type: "mdxJsxAttribute", name: "source", value: node.value ?? "" },
        ];
        node.children = [];
        delete node.lang;
        delete node.meta;
        delete node.value;
        return;
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

function escapeCode(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  };
  return text.replace(/[&<>"]/g, (c) => map[c]);
}

const CODE_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
};

function decodeCodeEntities(text: string): string {
  return text.replace(
    /&(?:amp|lt|gt|quot|#39|#x27);/g,
    (entity) => CODE_ENTITIES[entity] ?? entity,
  );
}

/**
 * Upgrade remark-rendered `<pre><code>` blocks to the same output the
 * markdown-it pipeline emits: highlight.js markup inside the
 * copy/wrap/fullscreen toolbar container.
 */
function highlightCodeBlocks(html: string): string {
  return html.replace(
    /<pre><code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
    (match, classAttr: string | undefined, inner: string) => {
      const lang = /language-([\w-]+)/.exec(classAttr ?? "")?.[1] ?? null;
      const code = decodeCodeEntities(inner);
      let highlighted: string;
      try {
        highlighted =
          lang && hljs.getLanguage(lang)
            ? hljs.highlight(code, { language: lang }).value
            : escapeCode(code);
      } catch {
        highlighted = escapeCode(code);
      }
      return renderCodeBlockWithToolbar(highlighted, lang, code, escapeCode);
    },
  );
}

export type { TocItem };

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

  const remarkPlugins: CompileOptions["remarkPlugins"] = [
    remarkGfm,
    remarkFrontmatter,
    remarkMdxFrontmatter,
    remarkMath,
  ];
  // Skip the quiz transform when the Quiz component is disabled — otherwise
  // the emitted <Quiz> element would reference an unregistered component.
  if (settings.mdx.components["Quiz"] !== false) {
    remarkPlugins.push(remarkQuiz);
  }

  const compiled = await compile(content, {
    outputFormat: "function-body",
    remarkPlugins,
    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings, rehypeKatex],
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

  // Shared post-processing so .mdx output matches .md: GitHub + triple-colon
  // callouts, syntax-highlighted code blocks with toolbar, wrapped tables.
  html = convertGithubCallouts(html);
  html = highlightCodeBlocks(html);
  html = wrapTables(html);

  const toc = extractToc(html);

  return { html, frontmatter, toc };
}

