import type MarkdownIt from "markdown-it";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";
import katex from "katex";

/**
 * GitHub-style math support for markdown-it, rendered server-side with KaTeX.
 *
 * Supported syntaxes (per GitHub's spec):
 * - Inline:  $...$
 * - Inline:  $`...`$
 * - Block:   $$...$$
 * - Block:   ```math fenced code blocks
 *
 * https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/writing-mathematical-expressions
 */

export function renderKatex(content: string, displayMode: boolean): string {
  try {
    return katex.renderToString(content, {
      throwOnError: false,
      displayMode,
    });
  } catch {
    const escaped = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return displayMode
      ? `<pre><code>${escaped}</code></pre>`
      : `<code>${escaped}</code>`;
  }
}

// Test if a $ at pos can open/close an inline math expression
function isValidDelim(
  state: StateInline,
  pos: number,
): { canOpen: boolean; canClose: boolean } {
  const max = state.posMax;
  let canOpen = true;
  let canClose = true;

  const prevChar = pos > 0 ? state.src.charCodeAt(pos - 1) : -1;
  const nextChar = pos + 1 <= max ? state.src.charCodeAt(pos + 1) : -1;

  // Closing $ can't be preceded by whitespace or followed by a digit
  if (
    prevChar === 0x20 /* " " */ ||
    prevChar === 0x09 /* \t */ ||
    (nextChar >= 0x30 /* 0 */ && nextChar <= 0x39) /* 9 */
  ) {
    canClose = false;
  }

  // Opening $ can't be followed by whitespace
  if (nextChar === 0x20 || nextChar === 0x09) {
    canOpen = false;
  }

  return { canOpen, canClose };
}

function mathInline(state: StateInline, silent: boolean): boolean {
  if (state.src[state.pos] !== "$") {
    return false;
  }

  // GitHub explicit inline syntax: $`expression`$
  if (state.src[state.pos + 1] === "`") {
    const closeIdx = state.src.indexOf("`$", state.pos + 2);
    if (closeIdx !== -1 && closeIdx > state.pos + 1) {
      if (!silent) {
        const token = state.push("math_inline", "math", 0);
        token.markup = "$`";
        token.content = state.src.slice(state.pos + 2, closeIdx);
      }
      state.pos = closeIdx + 2;
      return true;
    }
  }

  let res = isValidDelim(state, state.pos);
  if (!res.canOpen) {
    if (!silent) {
      state.pending += "$";
    }
    state.pos += 1;
    return true;
  }

  // Scan for closing $, skipping escaped \$
  const start = state.pos + 1;
  let match = start;
  let pos;
  while ((match = state.src.indexOf("$", match)) !== -1) {
    pos = match - 1;
    while (state.src[pos] === "\\") {
      pos -= 1;
    }
    // Even number of backslashes -> unescaped delimiter
    if ((match - pos) % 2 === 1) {
      break;
    }
    match += 1;
  }

  // No closing delimiter found
  if (match === -1) {
    if (!silent) {
      state.pending += "$";
    }
    state.pos = start;
    return true;
  }

  // Empty content: $$ treated as literal
  if (match - start === 0) {
    if (!silent) {
      state.pending += "$$";
    }
    state.pos = start + 1;
    return true;
  }

  res = isValidDelim(state, match);
  if (!res.canClose) {
    if (!silent) {
      state.pending += "$";
    }
    state.pos = start;
    return true;
  }

  if (!silent) {
    const token = state.push("math_inline", "math", 0);
    token.markup = "$";
    token.content = state.src.slice(start, match);
  }

  state.pos = match + 1;
  return true;
}

function mathBlock(
  state: StateBlock,
  start: number,
  end: number,
  silent: boolean,
): boolean {
  let pos = state.bMarks[start] + state.tShift[start];
  let max = state.eMarks[start];

  if (pos + 2 > max) {
    return false;
  }
  if (state.src.slice(pos, pos + 2) !== "$$") {
    return false;
  }

  pos += 2;
  let firstLine = state.src.slice(pos, max);

  if (silent) {
    return true;
  }

  let found = false;
  let lastLine = "";
  if (firstLine.trim().slice(-2) === "$$") {
    // Single-line expression: $$...$$
    firstLine = firstLine.trim().slice(0, -2);
    found = true;
  }

  let next = start;
  for (; !found; ) {
    next++;
    if (next >= end) {
      break;
    }

    pos = state.bMarks[next] + state.tShift[next];
    max = state.eMarks[next];

    if (pos < max && state.tShift[next] < state.blkIndent) {
      // Non-empty line with negative indent ends the block
      break;
    }

    const line = state.src.slice(pos, max);
    if (line.trim().slice(-2) === "$$") {
      const lastPos = line.lastIndexOf("$$");
      lastLine = line.slice(0, lastPos);
      found = true;
    }
  }

  state.line = next + 1;

  const token = state.push("math_block", "math", 0);
  token.block = true;
  token.content =
    (firstLine && firstLine.trim() ? firstLine + "\n" : "") +
    state.getLines(start + 1, next, state.tShift[start], true) +
    (lastLine && lastLine.trim() ? lastLine : "");
  token.map = [start, state.line];
  token.markup = "$$";
  return true;
}

export function mathPlugin(md: MarkdownIt): void {
  md.inline.ruler.after("escape", "math_inline", mathInline);
  md.block.ruler.after("blockquote", "math_block", mathBlock, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });

  md.renderer.rules.math_inline = (tokens, idx) =>
    renderKatex(tokens[idx].content, false);

  md.renderer.rules.math_block = (tokens, idx) =>
    `<div class="math-block">${renderKatex(tokens[idx].content.trim(), true)}</div>\n`;

  // Support ```math fenced code blocks (GitHub style)
  const defaultFence =
    md.renderer.rules.fence ||
    ((tokens, idx, options, env, self) =>
      self.renderToken(tokens, idx, options));
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const info = token.info.trim().split(/\s+/)[0];
    if (info === "math") {
      return `<div class="math-block">${renderKatex(token.content.trim(), true)}</div>\n`;
    }
    return defaultFence(tokens, idx, options, env, self);
  };
}
