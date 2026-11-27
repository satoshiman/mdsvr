import { render, PeleError } from "pele";

export interface MermaidDiagram {
  /** SVG markup when the source renders successfully. */
  svg?: string;
  /** Human-readable parse/render error for unsupported or invalid input. */
  error?: string;
}

/**
 * Render Mermaid source to SVG at render time via Pele. Colors and fonts
 * resolve from `--pele-*` CSS variables, so a single render adapts to the
 * active theme without a client-side re-render pass.
 */
export function renderMermaid(source: string): MermaidDiagram {
  try {
    return { svg: render(source.trim()).svg };
  } catch (err) {
    if (err instanceof PeleError) {
      return { error: err.message };
    }
    throw err;
  }
}
