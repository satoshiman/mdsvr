import path from "node:path";
import { promises as fs } from "node:fs";
import type { Settings } from "../settings/index.js";
import type { TocItem } from "../renderer/markdown.js";

export interface NavItem {
  title: string;
  href: string;
  children?: NavItem[];
  active?: boolean;
  hasActiveChild?: boolean;
  type: "file" | "dir";
  order?: number;
  sortBy: string;
  manualOrder?: number;
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
    .replace(/^\d+\./, "")
    .replace(/[-_]/g, " ")
    .replace(/\.\w+$/, "")
    .trim()
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

async function hasDirectoryIndex(
  dirPath: string,
  settings: Settings,
): Promise<boolean> {
  for (const indexFile of settings.files.indexFiles) {
    const indexPath = path.join(dirPath, indexFile);
    try {
      await fs.access(indexPath);
      return true;
    } catch {
      // Continue to next index file
    }
  }
  return false;
}

async function getDirectoryTitle(
  dirPath: string,
  folderName: string,
  settings: Settings,
): Promise<string> {
  // Try to extract title from index file (README.md, index.md, etc.)
  for (const indexFile of settings.files.indexFiles) {
    const indexPath = path.join(dirPath, indexFile);
    try {
      await fs.access(indexPath);
      const title = await extractTitle(indexPath, settings);
      if (title && title !== "Home") {
        return title;
      }
    } catch {
      // Continue to next index file
    }
  }

  // Fallback to humanizeFilename
  return humanizeFilename(folderName);
}

async function hasDocFiles(
  dirPath: string,
  settings: Settings,
): Promise<boolean> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (isHidden(fullPath, settings)) continue;

    if (entry.isDirectory()) {
      if (await hasDocFiles(fullPath, settings)) return true;
    } else if (
      entry.name.endsWith(".md") ||
      entry.name.endsWith(".mdx") ||
      entry.name.endsWith(".txt")
    ) {
      return true;
    }
  }
  return false;
}

function withBasePath(
  href: string,
  settings: Settings,
  isStaticExport?: boolean,
): string {
  if (!isStaticExport) return href;
  const basePath = settings.generate.basePath || "";
  if (!basePath) return href;
  // Ensure basePath starts with / but doesn't end with /
  const normalizedBase = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;
  // href always starts with /, so we combine them
  return normalizedBase + href;
}

async function readDirRecursive(
  dirPath: string,
  rootDir: string,
  currentPath: string,
  settings: Settings,
  isStaticExport: boolean = false,
  depth: number = 0,
): Promise<NavItem[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const items: NavItem[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath =
      "/" + path.relative(rootDir, fullPath).replace(/\\/g, "/");

    if (isHidden(fullPath, settings)) continue;

    if (entry.isDirectory()) {
      // Check docsOnly - skip directories without doc files
      if (settings.navigation.sidebar.docsOnly) {
        const hasDocs = await hasDocFiles(fullPath, settings);
        if (!hasDocs && !(await hasDirectoryIndex(fullPath, settings))) {
          continue;
        }
      }

      // Check depth - stop recursion if depth exceeds limit
      const maxDepth = settings.navigation.sidebar.depth;
      const shouldRecurse = depth < maxDepth;

      const children = shouldRecurse
        ? await readDirRecursive(
            fullPath,
            rootDir,
            currentPath,
            settings,
            isStaticExport,
            depth + 1,
          )
        : [];

      // Check if directory has any files (not just .md/.mdx)
      const entries = await fs.readdir(fullPath);
      const hasAnyFile = entries.some(
        (name) => !isHidden(path.join(fullPath, name), settings),
      );
      // Include directory if it has children OR has any file OR has index file
      if (
        children.length > 0 ||
        hasAnyFile ||
        (await hasDirectoryIndex(fullPath, settings))
      ) {
        const dirTitle = await getDirectoryTitle(
          fullPath,
          entry.name,
          settings,
        );
        items.push({
          title: dirTitle,
          href: withBasePath(relativePath + "/", settings, isStaticExport),
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
      const href = withBasePath(
        relativePath.replace(/\.(md|mdx)$/, ""),
        settings,
        isStaticExport,
      );
      items.push({
        title,
        href,
        type: "file",
        sortBy: baseName.toLowerCase(),
      });
    }
  }

  // Sort based on orderBy setting
  const orderBy = settings.navigation.sidebar.orderBy;
  const manualOrderList = settings.navigation.sidebar.manualOrder || [];

  return items.sort((a, b) => {
    switch (orderBy) {
      case "manual": {
        const aIndex = manualOrderList.indexOf(a.sortBy);
        const bIndex = manualOrderList.indexOf(b.sortBy);
        // Items in manualOrder list come first, in specified order
        // Items not in list are appended at end, sorted alphabetically
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.sortBy.localeCompare(b.sortBy);
      }

      case "prior-dir": {
        // Folder first, then file; same type sort by name
        if (a.type === "dir" && b.type !== "dir") return -1;
        if (a.type !== "dir" && b.type === "dir") return 1;
        return a.sortBy.localeCompare(b.sortBy);
      }

      case "alphabetical":
      default: {
        // Mixed: folder & file together, pure alphabetical
        return a.sortBy.localeCompare(b.sortBy);
      }
    }
  });
}

export async function buildSidebar(
  rootDir: string,
  currentPath: string,
  settings: Settings,
  isStaticExport: boolean = false,
): Promise<NavItem[]> {
  if (!settings.navigation.sidebar.enabled) {
    return [];
  }

  const items = await readDirRecursive(
    rootDir,
    rootDir,
    currentPath,
    settings,
    isStaticExport,
    0,
  );

  // Check for root README.md and add Home item
  const readmePath = path.join(rootDir, "README.md");
  try {
    await fs.access(readmePath);
    const title = await extractTitle(readmePath, settings);
    // Insert Home at the beginning
    items.unshift({
      title: title || "Home",
      href: withBasePath("/", settings, isStaticExport),
      type: "file",
      sortBy: "",
    });
  } catch {
    // No README.md at root
  }

  // Mark active item and parent directories
  function markActive(items: NavItem[]): boolean {
    let hasActive = false;
    for (const item of items) {
      const isRoot = item.href === "/";
      const isExactMatch = item.href === currentPath;

      // Check if currentPath is an index file within this directory
      // e.g., currentPath="/features/README.md" should match folder href="/features/"
      const isIndexMatch =
        item.type === "dir" &&
        (currentPath === item.href + "README.md" ||
          currentPath === item.href + "readme.md" ||
          currentPath === item.href + "index.md");

      // Check if currentPath has .md/.mdx extension but item href doesn't
      // e.g., currentPath="/projects/github/github.md" should match item href="/projects/github/github"
      const isExtensionMatch =
        item.type === "file" &&
        (currentPath === item.href + ".md" ||
          currentPath === item.href + ".mdx");

      // Check if currentPath is a child of this directory (for items deeper than sidebar depth)
      // e.g., currentPath="/k8s/practices/pvc-homework/EXERCISE.md" should match folder href="/k8s/practices/pvc-homework/"
      const isChildMatch =
        item.type === "dir" &&
        (currentPath.startsWith(item.href) ||
          currentPath.startsWith(item.href.replace(/\/$/, "")));

      // Check if currentPath is directory without trailing slash
      // e.g., currentPath="/k8s/practices/pvc-homework" should match folder href="/k8s/practices/pvc-homework/"
      const isDirWithoutSlash =
        item.type === "dir" && currentPath === item.href.replace(/\/$/, "");

      const isActive = isRoot
        ? currentPath === "/" || currentPath === ""
        : isExactMatch ||
          isIndexMatch ||
          isExtensionMatch ||
          isChildMatch ||
          isDirWithoutSlash;

      if (isActive) {
        item.active = true;
        hasActive = true;
      }

      if (item.children) {
        const childHasActive = markActive(item.children);
        if (childHasActive) {
          item.hasActiveChild = true;
          hasActive = true;
        }
      }
    }
    return hasActive;
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

    // Auto-expand folders that contain active item or have active child
    const shouldExpand =
      item.hasActiveChild ||
      item.active ||
      settings.navigation.sidebar.defaultOpen;

    lines.push(
      `${indent}  <li class="nav-item${activeClass}${folderClass}" data-type="${item.type}">`,
    );

    const icon =
      item.type === "dir"
        ? hasChildren
          ? shouldExpand
            ? "📂"
            : "📁"
          : "📁"
        : "";

    if (hasChildren) {
      lines.push(
        `${indent}    <div class="nav-item-header" data-expanded="${shouldExpand}">`,
      );
      lines.push(
        `${indent}      <a href="${item.href}" class="nav-link${activeClass}" data-folder-icon="${shouldExpand ? "open" : "closed"}"><span class="folder-icon">${icon}</span> ${escapeHtml(item.title)}</a>`,
      );
      lines.push(`${indent}    </div>`);
    } else {
      lines.push(
        `${indent}    <a href="${item.href}" class="nav-link${activeClass}">${icon ? icon + " " : ""}${escapeHtml(item.title)}</a>`,
      );
    }

    if (hasChildren) {
      lines.push(
        `${indent}    <div class="nav-children" data-expanded="${shouldExpand}">`,
      );
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

export interface PrevNextLinks {
  prev: { title: string; href: string } | null;
  next: { title: string; href: string } | null;
}

function flattenNavItems(
  items: NavItem[],
): { title: string; href: string; type: "file" | "dir" }[] {
  const result: { title: string; href: string; type: "file" | "dir" }[] = [];
  for (const item of items) {
    if (item.type === "file") {
      result.push({ title: item.title, href: item.href, type: item.type });
    }
    if (item.type === "dir") {
      // Include directory itself if it has an index page
      result.push({ title: item.title, href: item.href, type: item.type });
      if (item.children && item.children.length > 0) {
        result.push(...flattenNavItems(item.children));
      }
    }
  }
  return result;
}

export function getPrevNext(
  sidebar: NavItem[],
  currentPath: string,
): PrevNextLinks {
  const flat = flattenNavItems(sidebar);

  const currentIndex = flat.findIndex((item) => {
    if (item.href === currentPath) return true;
    // Match without trailing slash
    if (item.href === currentPath + "/") return true;
    if (item.href + "/" === currentPath) return true;
    // Match .md/.mdx extension
    if (item.href + ".md" === currentPath) return true;
    if (item.href + ".mdx" === currentPath) return true;
    // Match directory index files (README.md, index.md served under dir href)
    if (
      item.type === "dir" &&
      (currentPath === item.href + "README.md" ||
        currentPath === item.href + "readme.md" ||
        currentPath === item.href + "index.md" ||
        currentPath === item.href + "index.mdx")
    )
      return true;
    return false;
  });

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: currentIndex > 0 ? flat[currentIndex - 1] : null,
    next: currentIndex < flat.length - 1 ? flat[currentIndex + 1] : null,
  };
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
