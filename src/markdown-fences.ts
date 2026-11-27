/**
 * Lines that belong to fenced code blocks (fence markers and their
 * contents). A ``` or ~~~ opening fence closes on a marker with the same
 * char and at least the same length, matching markdown-it behavior, so
 * headings and comments inside code are not mistaken for real headings.
 */
export function fencedCodeLines(content: string): Set<number> {
  const inside = new Set<number>();
  const lines = content.split("\n");

  let inFence = false;
  let fenceChar = "";
  let fenceLen = 0;

  lines.forEach((line, index) => {
    const m = line.match(/^\s*(`{3,}|~{3,})/);

    if (inFence) {
      inside.add(index);
      if (m && m[1][0] === fenceChar && m[1].length >= fenceLen) {
        inFence = false;
      }
      return;
    }

    if (m) {
      inFence = true;
      fenceChar = m[1][0];
      fenceLen = m[1].length;
      inside.add(index);
    }
  });

  return inside;
}
