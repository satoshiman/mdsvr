import type { Settings } from "../settings/index.js";
import { renderMarkdown, type MarkdownResult } from "./markdown.js";
import { renderMdx, type MdxRenderResult } from "./mdx.js";

export type { MarkdownResult, MdxRenderResult };

export async function renderFile(
  content: string,
  filePath: string,
  settings: Settings,
): Promise<MarkdownResult | MdxRenderResult> {
  const ext = filePath.split(".").pop()?.toLowerCase();

  if (ext === "mdx" && settings.mdx.enabled) {
    return renderMdx(content, settings);
  }

  // Default to markdown renderer for .md and fallback
  return renderMarkdown(content, settings);
}

export function isMdxFile(filePath: string): boolean {
  return filePath.toLowerCase().endsWith(".mdx");
}
