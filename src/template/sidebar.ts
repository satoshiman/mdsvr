import path from "node:path";
import { promises as fs } from "node:fs";
import type { Settings } from "../settings/index.js";
import type { TocItem } from "../renderer/markdown.js";

export interface NavItem {
  title: string;
  href: string;
  children?: NavItem[];
  active?: boolean;
  type: "file" | "dir";
  order?: number;
  sortBy: string;
}

// Extract title from content (first h1 or frontmatter)
async function extractTitle(
  filePath: string,
  settings: Settings,
): Promise<string> {
  try {
    const content = await fs.readFile(filePath, "utf-8");

    // Check frontmatter for title
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const titleMatch = frontmatterMatch[1].match(/^title:\s*(.+)$/m);
      if (titleMatch) {
        return titleMatch[1].trim().replace(/^["']|["']$/g, "");
      }
    }

    // Check for first h1
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }
  } catch {
    // Fall through to filename
  }

  // Humanize filename
  const basename = path.basename(filePath, path.extname(filePath));
  return humanizeFilename(basename);
}

function humanizeFilename(filename: string): string {
  return filename
    .replace(/[-_]/g, " ")
    .replace(/\.\w+$/, "")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function isHidden(filePath: string, settings: Settings): boolean {
  const basename = path.basename(filePath);

  // Check hidden patterns
  for (const pattern of settings.files.extensions.hidden) {
    if (basename === pattern) return true;
    if (pattern.startsWith("*") && basename.endsWith(pattern.slice(1)))
      return true;
    if (pattern.endsWith("/*") && filePath.includes(pattern.slice(0, -1)))
      return true;
  }

  // Files starting with _ are hidden
  if (basename.startsWith("_")) return true;

  return false;
}

async function readDirRecursive(
  dirPath: string,
  rootDir: string,
  currentPath: string,
  settings: Settings,
): Promise<NavItem[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const items: NavItem[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath =
      "/" + path.relative(rootDir, fullPath).replace(/\\/g, "/");

    if (isHidden(fullPath, settings)) continue;

    if (entry.isDirectory()) {
      const children = await readDirRecursive(
        fullPath,
        rootDir,
        currentPath,
        settings,
      );
      if (children.length > 0) {
        items.push({
          title: humanizeFilename(entry.name),
          href: relativePath + "/",
          children,
          type: "dir",
          sortBy: entry.name.toLowerCase(),
        });
      }
    } else if (
      entry.name.endsWith(".md") ||
      (entry.name.endsWith(".mdx") && settings.mdx.enabled)
    ) {
      // Skip README files - they are rendered as directory index
      const baseName = entry.name.replace(/\.(md|mdx)$/i, "").toLowerCase();
      if (baseName === "readme") continue;

      const title = await extractTitle(fullPath, settings);
      const href = relativePath.replace(/\.(md|mdx)$/, "");
      items.push({
        title,
        href,
        type: "file",
        sortBy: baseName.toLowerCase(),
      });
    }
  }

  // Sort: folders first, then alphabetically by filename/folder name
  return items.sort((a, b) => {
    if (a.type === "dir" && b.type !== "dir") return -1;
    if (a.type !== "dir" && b.type === "dir") return 1;
    return a.sortBy.localeCompare(b.sortBy);
  });
}

export async function buildSidebar(
  rootDir: string,
  currentPath: string,
  settings: Settings,
): Promise<NavItem[]> {
  if (!settings.navigation.sidebar.enabled) {
    return [];
  }

  const items = await readDirRecursive(rootDir, rootDir, currentPath, settings);

  // Check for root README.md and add Home item
  const readmePath = path.join(rootDir, "README.md");
  try {
    await fs.access(readmePath);
    const title = await extractTitle(readmePath, settings);
    // Insert Home at the beginning
    items.unshift({
      title: title || "Home",
      href: "/",
      type: "file",
      sortBy: "",
    });
  } catch {
    // No README.md at root
  }

  // Mark active item - only exact match, not parent paths
  function markActive(items: NavItem[]): void {
    for (const item of items) {
      const isRoot = item.href === "/";
      const isExactMatch = item.href === currentPath;
      // Only exact match, no parent path highlighting
      const isActive = isRoot
        ? currentPath === "/" || currentPath === ""
        : isExactMatch;
      if (isActive) {
        item.active = true;
      }
      if (item.children) {
        markActive(item.children);
      }
    }
  }

  markActive(items);
  return items;
}

export function renderSidebar(
  items: NavItem[],
  settings: Settings,
  level = 0,
): string {
  if (items.length === 0) return "";

  const indent = "  ".repeat(level * 2);
  const lines: string[] = [];

  lines.push(`${indent}<ul class="sidebar-nav" data-level="${level}">`);

  for (const item of items) {
    const hasChildren = item.children && item.children.length > 0;
    const activeClass = item.active ? " active" : "";
    const folderClass = item.type === "dir" ? " folder" : "";

    lines.push(
      `${indent}  <li class="nav-item${activeClass}${folderClass}" data-type="${item.type}">`,
    );

    const icon = item.type === "dir" ? "📁" : "📄";

    lines.push(
      `${indent}    <a href="${item.href}" class="nav-link${activeClass}">${icon} ${escapeHtml(item.title)}</a>`,
    );

    if (hasChildren && settings.navigation.sidebar.defaultOpen) {
      lines.push(`${indent}    <div class="nav-children">`);
      lines.push(renderSidebar(item.children!, settings, level + 1));
      lines.push(`${indent}    </div>`);
    }

    lines.push(`${indent}  </li>`);
  }

  lines.push(`${indent}</ul>`);

  return lines.join("\n");
}

export function renderToc(toc: TocItem[], settings: Settings): string {
  if (!settings.navigation.tocEnabled || toc.length === 0) {
    return "";
  }

  const filtered = toc.filter(
    (item) => item.level <= settings.navigation.tocMaxDepth,
  );

  if (filtered.length === 0) return "";

  const lines: string[] = [];
  lines.push('<nav class="toc">');
  lines.push("  <h3>On this page</h3>");

  // Build nested tree structure from flat TOC array
  function buildTree(items: TocItem[], startLevel: number = 1): TocItem[] {
    const result: TocItem[] = [];
    let i = 0;

    while (i < items.length) {
      const item = items[i];

      if (item.level < startLevel) {
        // Stop when we hit a higher-level heading
        break;
      }

      if (item.level === startLevel) {
        // This is a sibling at current level
        const newItem = { ...item, children: [] as TocItem[] };
        // Find its children (higher levels until next sibling or parent)
        const childStart = i + 1;
        let childEnd = childStart;
        while (childEnd < items.length && items[childEnd].level > startLevel) {
          childEnd++;
        }
        newItem.children = buildTree(
          items.slice(childStart, childEnd),
          startLevel + 1,
        );
        result.push(newItem);
        i = childEnd;
      } else {
        // Skip items that are deeper than current level (they'll be handled as children)
        i++;
      }
    }

    return result;
  }

  function renderTocTree(items: TocItem[], level: number): string {
    if (items.length === 0) return "";

    const subLines: string[] = [];
    subLines.push(`<ul class="toc-list toc-level-${level}">`);

    for (const item of items) {
      const hasChildren = item.children && item.children.length > 0;
      subLines.push(
        `<li class="toc-item"><a href="#${item.slug}">${escapeHtml(item.text)}</a></li>`,
      );

      if (hasChildren) {
        subLines.push(renderTocTree(item.children!, level + 1));
      }
    }

    subLines.push("</ul>");
    return subLines.join("\n");
  }

  const tree = buildTree(filtered, 1);
  lines.push(renderTocTree(tree, 1));
  lines.push("</nav>");

  return lines.join("\n");
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
