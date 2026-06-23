import path from "node:path";
import { promises as fs } from "node:fs";
import { readdir } from "node:fs/promises";

export interface ValidationError {
  file: string;
  line: number;
  type:
    | "broken-link"
    | "invalid-structure"
    | "missing-frontmatter"
    | "heading-hierarchy"
    | "missing-h1"
    | "missing-asset"
    | "absolute-path"
    | "broken-anchor"
    | "index-files";
  message: string;
  suggestion?: string;
  autofix?: string;
  original?: string;
  icon?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  fixed: number;
}

export interface ValidateMarkdownOptions {
  rootDir: string;
  autofix?: boolean;
  checkLinks?: boolean;
  checkStructure?: boolean;
  checkAssets?: boolean;
}

/**
 * Extract all internal markdown links from content
 */
function extractInternalLinks(
  content: string,
  filePath: string,
): Array<{
  link: string;
  line: number;
  original: string;
}> {
  const links: Array<{ link: string; line: number; original: string }> = [];
  const lines = content.split("\n");

  // Match markdown links: [text](path) and [text](path#anchor), and images ![text](path)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  let inCodeBlock = false;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Check for code block boundaries (lines that start with ```)
    if (trimmedLine.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      return;
    }

    // Skip links inside code blocks
    if (inCodeBlock) {
      return;
    }

    // Also skip inline code (links inside `code`)
    if (trimmedLine.includes("`") && !trimmedLine.includes("```")) {
      // Simple check: if line has backticks, skip it (conservative approach)
      // This is a simplification - a proper parser would be more sophisticated
      const codeCount = (trimmedLine.match(/`/g) || []).length;
      if (codeCount >= 2) {
        return;
      }
    }

    let match;
    // Reset regex lastIndex for each line
    linkRegex.lastIndex = 0;
    while ((match = linkRegex.exec(line)) !== null) {
      const [, , url] = match;
      const original = match[0];
      const matchIndex = match.index;

      // Skip image links (they have ! before the [)
      if (matchIndex > 0 && line[matchIndex - 1] === "!") {
        continue;
      }

      // Skip asset files (images, fonts, etc.) - they're optional/user-provided
      if (
        /\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|css|js)$/i.test(
          url,
        )
      ) {
        continue;
      }

      // Skip links to /assets/ directory - they're optional/user-provided
      if (url.startsWith("/assets/") || url.includes("/assets/")) {
        continue;
      }

      // Skip external links
      if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("//")
      ) {
        continue;
      }

      // Skip mailto, tel, and other protocols (but allow / for absolute path check)
      if (/^[a-z]+:/i.test(url) && !url.startsWith("#")) {
        continue;
      }

      links.push({
        link: url,
        line: index + 1,
        original,
      });
    }
  });

  return links;
}

/**
 * Extract all asset links (images, fonts, etc.) from content
 */
function extractAssetLinks(
  content: string,
  filePath: string,
): Array<{
  link: string;
  line: number;
  original: string;
}> {
  const assets: Array<{ link: string; line: number; original: string }> = [];
  const lines = content.split("\n");

  // Match markdown images: ![alt](path)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

  let inCodeBlock = false;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Check for code block boundaries
    if (trimmedLine.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      return;
    }

    // Skip links inside code blocks
    if (inCodeBlock) {
      return;
    }

    // Skip inline code
    if (trimmedLine.includes("`") && !trimmedLine.includes("```")) {
      const codeCount = (trimmedLine.match(/`/g) || []).length;
      if (codeCount >= 2) {
        return;
      }
    }

    let match;
    imageRegex.lastIndex = 0;
    while ((match = imageRegex.exec(line)) !== null) {
      const [, , url] = match;
      const original = match[0];

      // Skip external assets
      if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("//")
      ) {
        continue;
      }

      // Only include asset files
      if (
        /\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|css|js)$/i.test(
          url,
        )
      ) {
        assets.push({
          link: url,
          line: index + 1,
          original,
        });
      }
    }
  });

  return assets;
}

/**
 * Resolve a link relative to the file it's in
 */
async function resolveLink(
  link: string,
  filePath: string,
  rootDir: string,
): Promise<string> {
  const fileDir = path.dirname(filePath);
  let resolvedPath: string;

  if (link.startsWith("/")) {
    // Absolute path from root
    resolvedPath = path.join(rootDir, link.slice(1));
  } else if (link.startsWith("#")) {
    // Anchor - return the file itself
    resolvedPath = filePath;
  } else {
    // Relative path
    resolvedPath = path.resolve(fileDir, link);
  }

  // Remove anchor if present
  const anchorIndex = resolvedPath.indexOf("#");
  if (anchorIndex !== -1) {
    resolvedPath = resolvedPath.slice(0, anchorIndex);
  }

  // If no extension, check if it's a directory first
  if (!path.extname(resolvedPath)) {
    const readmePath = path.join(resolvedPath, "README.md");
    const mdPath = resolvedPath + ".md";
    const mdxPath = resolvedPath + ".mdx";

    // First check if it's a directory
    try {
      const stats = await fs.stat(resolvedPath);
      if (stats.isDirectory()) {
        resolvedPath = readmePath;
      } else {
        // Not a directory, try .md and .mdx
        if (await fileExists(mdPath)) {
          resolvedPath = mdPath;
        } else if (await fileExists(mdxPath)) {
          resolvedPath = mdxPath;
        } else {
          resolvedPath = mdPath;
        }
      }
    } catch {
      // Path doesn't exist, try README.md, .md, and .mdx
      if (await fileExists(readmePath)) {
        resolvedPath = readmePath;
      } else if (await fileExists(mdPath)) {
        resolvedPath = mdPath;
      } else if (await fileExists(mdxPath)) {
        resolvedPath = mdxPath;
      } else {
        // Default to .md for validation
        resolvedPath = mdPath;
      }
    }
  }

  return resolvedPath;
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract all heading IDs from markdown content
 * GitHub-flavored markdown heading IDs are generated by:
 * - Converting to lowercase
 * - Removing non-alphanumeric characters (except hyphens)
 * - Replacing spaces with hyphens
 * - Removing consecutive hyphens
 */
function extractHeadingIds(content: string): Set<string> {
  const headingIds = new Set<string>();
  const lines = content.split("\n");

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const headingText = headingMatch[2];
      // Generate GitHub-style heading ID
      const headingId = headingText
        .toLowerCase()
        .replace(/[^\w\s-]/g, "") // Remove non-alphanumeric except space and hyphen
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-") // Replace consecutive hyphens with single hyphen
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
      headingIds.add(headingId);
    }
  }

  return headingIds;
}

/**
 * Validate internal links in a markdown file
 */
async function validateInternalLinks(
  content: string,
  filePath: string,
  rootDir: string,
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  const links = extractInternalLinks(content, filePath);
  const headingIds = extractHeadingIds(content);

  for (const { link, line, original } of links) {
    // Check for absolute paths
    if (link.startsWith("/")) {
      errors.push({
        file: path.relative(rootDir, filePath),
        line,
        type: "absolute-path",
        message: `Absolute path detected: ${link}`,
        suggestion: "Use relative paths instead (e.g., ./path or ../path)",
        original,
        icon: "⚠️",
      });
      continue;
    }

    // Check for index file links (will break on export)
    const linkWithoutAnchorForCheck = link.split("#")[0];
    const indexFilePatterns = [
      // README variants
      /README\.md$/i,
      /readme\.md$/i,
      /README\.mdx$/i,
      /readme\.mdx$/i,
      /\/README$/i,
      /\/readme$/i,
      // index variants
      /index\.md$/i,
      /INDEX\.md$/i,
      /index\.mdx$/i,
      /INDEX\.mdx$/i,
      /index\.html$/i,
      /index\.htm$/i,
      /\/index$/i,
      /\/INDEX$/i,
    ];

    if (
      indexFilePatterns.some((pattern) =>
        pattern.test(linkWithoutAnchorForCheck),
      )
    ) {
      const dirPath = linkWithoutAnchorForCheck.replace(
        /\/?(README|readme|index|INDEX)(\.(md|mdx|html|htm))?$/i,
        "",
      );
      errors.push({
        file: path.relative(rootDir, filePath),
        line,
        type: "index-files",
        message: `Link to index file will break on export: ${link}`,
        suggestion: `Use directory path instead: ${dirPath || "./"}`,
        original,
        icon: "⚠️",
      });
      continue;
    }

    // Extract anchor if present
    const anchorIndex = link.indexOf("#");
    const anchor = anchorIndex !== -1 ? link.slice(anchorIndex + 1) : null;
    const linkWithoutAnchor =
      anchorIndex !== -1 ? link.slice(0, anchorIndex) : link;

    // Handle anchor-only links (e.g., #section)
    if (anchor && linkWithoutAnchor === "") {
      if (!headingIds.has(anchor)) {
        errors.push({
          file: path.relative(rootDir, filePath),
          line,
          type: "broken-anchor",
          message: `Broken anchor: #${anchor}`,
          suggestion: `Check if heading exists. Available headings: ${Array.from(headingIds).slice(0, 5).join(", ")}${headingIds.size > 5 ? "..." : ""}`,
          original,
          icon: "🔗",
        });
      }
      continue;
    }

    const resolvedPath = await resolveLink(
      linkWithoutAnchor,
      filePath,
      rootDir,
    );

    // Check anchor if present
    if (anchor) {
      // If link points to same file, check if anchor exists
      if (resolvedPath === filePath) {
        if (!headingIds.has(anchor)) {
          errors.push({
            file: path.relative(rootDir, filePath),
            line,
            type: "broken-anchor",
            message: `Broken anchor: #${anchor}`,
            suggestion: `Check if heading exists. Available headings: ${Array.from(headingIds).slice(0, 5).join(", ")}${headingIds.size > 5 ? "..." : ""}`,
            original,
            icon: "🔗",
          });
        }
        continue; // Skip file existence check for self-link with anchor
      }
      // If link points to different file, we need to load that file's content
      // For now, skip this check as it would require loading all linked files
      // This is a limitation - we only validate anchors in the same file
    }

    // Skip self-links without anchor
    if (resolvedPath === filePath) {
      continue;
    }

    const exists = await fileExists(resolvedPath);

    if (!exists) {
      // Try to find similar files for suggestion
      const fileDir = path.dirname(resolvedPath);
      const fileName = path.basename(resolvedPath, ".md");
      const suggestion = await findSimilarFile(fileDir, fileName, rootDir);

      let autofix: string | undefined;
      if (suggestion) {
        const relativePath = path.relative(path.dirname(filePath), suggestion);
        const newLink = relativePath.startsWith("..")
          ? relativePath
          : `./${relativePath}`;
        autofix = original.replace(link, newLink);
      }

      errors.push({
        file: path.relative(rootDir, filePath),
        line,
        type: "broken-link",
        message: `Broken link: ${link} -> ${resolvedPath}`,
        suggestion: suggestion
          ? `Did you mean: ${path.relative(rootDir, suggestion)}?`
          : undefined,
        autofix,
        original,
        icon: "🔗",
      });
    }
  }

  return errors;
}

/**
 * Validate asset links (images, fonts, etc.) in a markdown file
 */
async function validateAssetLinks(
  content: string,
  filePath: string,
  rootDir: string,
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  const assets = extractAssetLinks(content, filePath);

  for (const { link, line, original } of assets) {
    // Check for absolute paths
    if (link.startsWith("/")) {
      errors.push({
        file: path.relative(rootDir, filePath),
        line,
        type: "absolute-path",
        message: `Absolute path detected: ${link}`,
        suggestion: "Use relative paths instead (e.g., ./path or ../path)",
        original,
        icon: "⚠️",
      });
      continue;
    }

    const resolvedPath: string = path.resolve(path.dirname(filePath), link);

    const exists = await fileExists(resolvedPath);

    if (!exists) {
      errors.push({
        file: path.relative(rootDir, filePath),
        line,
        type: "missing-asset",
        message: `Missing asset: ${link}`,
        suggestion:
          "Create the assets folder and add the file, or remove the reference",
        icon: "🖼️",
      });
    }
  }

  return errors;
}

/**
 * Find similar files in the same directory
 */
async function findSimilarFile(
  dir: string,
  fileName: string,
  rootDir: string,
): Promise<string | null> {
  try {
    const files = await readdir(dir);
    const normalizedTarget = fileName.toLowerCase();

    // Exact match with different case
    const exactMatch = files.find(
      (f) => f.toLowerCase() === normalizedTarget + ".md",
    );
    if (exactMatch) {
      return path.join(dir, exactMatch);
    }

    // Fuzzy match (Levenshtein distance simplified)
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const name = file.slice(0, -3).toLowerCase();
      const score = calculateSimilarity(normalizedTarget, name);
      if (score > 0.6 && score > bestScore) {
        bestScore = score;
        bestMatch = file;
      }
    }

    return bestMatch ? path.join(dir, bestMatch) : null;
  } catch {
    return null;
  }
}

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) return 1;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Simple Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator,
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Validate markdown structure
 */
function validateStructure(
  content: string,
  filePath: string,
  rootDir: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = content.split("\n");

  // Check for frontmatter (optional - just skip check)
  // Frontmatter is optional, so we don't add errors for missing it

  // Check for missing H1
  let hasH1 = false;
  let lastLevel = 0;
  lines.forEach((line, index) => {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;

      if (level === 1) {
        hasH1 = true;
      }

      if (level > lastLevel + 1 && lastLevel > 0) {
        const correctLevel = lastLevel + 1;
        const originalHeading = line;
        const newHeading = "#".repeat(correctLevel) + line.slice(level);
        errors.push({
          file: path.relative(rootDir, filePath),
          line: index + 1,
          type: "heading-hierarchy",
          message: `Heading level jumped from H${lastLevel} to H${level}`,
          suggestion: `Use H${correctLevel} instead of H${level}`,
          autofix: newHeading,
          original: originalHeading,
          icon: "📝",
        });
      }
      lastLevel = level;
    }
  });

  if (!hasH1) {
    // Find the first non-empty, non-frontmatter line to insert H1 before
    let insertLine = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === "---" && i === 0) {
        // Skip frontmatter
        continue;
      }
      if (trimmed === "---" && i > 0) {
        // End of frontmatter, insert after this line
        insertLine = i + 1;
        break;
      }
      if (trimmed && !trimmed.startsWith("#")) {
        // First content line
        insertLine = i;
        break;
      }
    }

    const h1Autofix = "# " + (path.basename(filePath, ".md") || "Title");
    errors.push({
      file: path.relative(rootDir, filePath),
      line: insertLine + 1,
      type: "missing-h1",
      message: "Missing H1 heading",
      suggestion: "Add a top-level heading: # Your Title",
      autofix: h1Autofix,
      original: "",
      icon: "📌",
    });
  }

  return errors;
}

/**
 * Get all markdown files in a directory recursively
 */
async function getAllMarkdownFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip hidden files and directories
      if (entry.name.startsWith(".") || entry.name === "_mdsvr") {
        continue;
      }

      // Skip node_modules
      if (entry.name === "node_modules") {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
        files.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

/**
 * Main validation function
 */
export async function validateMarkdown(
  options: ValidateMarkdownOptions,
): Promise<ValidationResult> {
  const {
    rootDir,
    autofix = false,
    checkLinks = true,
    checkStructure = true,
    checkAssets = true,
  } = options;
  const errors: ValidationError[] = [];
  let fixed = 0;

  // Log root directory for debugging
  console.log(`🔍 Validating markdown files in: ${rootDir}`);

  const markdownFiles = await getAllMarkdownFiles(rootDir);

  for (const filePath of markdownFiles) {
    const content = await fs.readFile(filePath, "utf-8");

    const linkErrors = checkLinks
      ? await validateInternalLinks(content, filePath, rootDir)
      : [];
    const assetErrors = checkAssets
      ? await validateAssetLinks(content, filePath, rootDir)
      : [];
    const structureErrors = checkStructure
      ? validateStructure(content, filePath, rootDir)
      : [];

    errors.push(...linkErrors, ...assetErrors, ...structureErrors);

    // Apply autofix if enabled
    if (autofix) {
      let newContent = content;
      let hasFixes = false;
      const lines = newContent.split("\n");

      // Fix link errors
      for (const error of linkErrors) {
        if (error.autofix) {
          newContent = newContent.replace(error.original!, error.autofix);
          hasFixes = true;
          fixed++;
        }
      }

      // Fix structure errors (by line index for accuracy)
      for (const error of structureErrors) {
        if (error.autofix) {
          if (error.type === "missing-h1" && error.original === "") {
            // Insert H1 at the beginning
            lines.splice(error.line - 1, 0, error.autofix);
            hasFixes = true;
            fixed++;
          } else if (error.original && error.line > 0) {
            // Replace specific line
            const lineIndex = error.line - 1;
            if (lineIndex < lines.length) {
              lines[lineIndex] = error.autofix;
              hasFixes = true;
              fixed++;
            }
          }
        }
      }

      if (hasFixes) {
        newContent = lines.join("\n");
        await fs.writeFile(filePath, newContent, "utf-8");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fixed,
  };
}
