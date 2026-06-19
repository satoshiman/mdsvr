// OG Image generator using Satori and Resvg

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { promises as fs, mkdir } from "node:fs";
import path from "node:path";
import https from "node:https";
import type {
  OgImageData,
  OgGenerationOptions,
  OgGenerationResult,
} from "./types.js";
import { generateOgTemplate, OG_WIDTH, OG_HEIGHT } from "./template.js";

// Font CDN URLs - using jsDelivr for reliable font delivery
const FONT_URLS: Record<string, string> = {
  Inter:
    "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-400-normal.woff",
  "Inter-400":
    "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-400-normal.woff",
  "Inter-600":
    "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-600-normal.woff",
  "Inter-700":
    "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-700-normal.woff",
  "Inter-800":
    "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-800-normal.woff",
  "Inter-400-vietnamese":
    "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-vietnamese-400-normal.woff",
  "Inter-600-vietnamese":
    "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-vietnamese-600-normal.woff",
  "Inter-700-vietnamese":
    "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-vietnamese-700-normal.woff",
  "Inter-800-vietnamese":
    "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-vietnamese-800-normal.woff",
  "NotoSans-400-vietnamese":
    "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.0.19/files/noto-sans-vietnamese-400-normal.woff",
  "NotoSans-600-vietnamese":
    "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.0.19/files/noto-sans-vietnamese-600-normal.woff",
  "NotoSans-700-vietnamese":
    "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.0.19/files/noto-sans-vietnamese-700-normal.woff",
  "NotoSans-800-vietnamese":
    "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.0.19/files/noto-sans-vietnamese-800-normal.woff",
};

// Font data cache
const fontCache = new Map<string, Buffer>();

/**
 * Download font from URL
 */
function downloadFont(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { timeout: 30000 }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download font: ${res.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

/**
 * Load font data (with caching and CDN fallback)
 */
async function loadFont(
  fontFamily: string,
  weight = 400,
): Promise<Buffer | null> {
  const cacheKey = `${fontFamily}-${weight}`;

  // Check cache first
  if (fontCache.has(cacheKey)) {
    return fontCache.get(cacheKey)!;
  }

  try {
    // Try to load from CDN for Inter
    if (fontFamily.toLowerCase() === "inter") {
      const fontUrl = FONT_URLS[`Inter-${weight}`] || FONT_URLS["Inter"];
      if (fontUrl) {
        try {
          const data = await downloadFont(fontUrl);
          fontCache.set(cacheKey, data);
          return data;
        } catch {
          // Fallback to next method
        }
      }
    }

    // Try to load from local paths
    const possiblePaths = [
      path.join(
        process.cwd(),
        "assets",
        "fonts",
        `${fontFamily}-${weight}.woff2`,
      ),
      path.join(
        process.cwd(),
        "assets",
        "fonts",
        `${fontFamily}-${weight}.woff`,
      ),
      path.join(process.cwd(), "assets", "fonts", `${fontFamily}.ttf`),
      path.join(
        process.cwd(),
        "src",
        "assets",
        "fonts",
        `${fontFamily}-${weight}.woff2`,
      ),
      path.join(process.cwd(), "src", "assets", "fonts", `${fontFamily}.ttf`),
    ];

    for (const fontPath of possiblePaths) {
      try {
        const data = await fs.readFile(fontPath);
        fontCache.set(cacheKey, data);
        return data;
      } catch {
        // Continue to next path
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Load a Vietnamese-capable font for the given font family and weight.
 * For Inter, use the Inter Vietnamese variant. For other fonts, fall back to
 * Noto Sans Vietnamese so Vietnamese characters (diacritics) render correctly.
 */
async function loadVietnameseFont(
  fontFamily: string,
  weight = 400,
): Promise<Buffer | null> {
  const cacheKey = `${fontFamily}-${weight}-vietnamese`;

  if (fontCache.has(cacheKey)) {
    return fontCache.get(cacheKey)!;
  }

  const isInter = fontFamily.toLowerCase() === "inter";
  const fontUrl = isInter
    ? FONT_URLS[`Inter-${weight}-vietnamese`]
    : FONT_URLS[`NotoSans-${weight}-vietnamese`];

  if (!fontUrl) {
    return null;
  }

  try {
    const data = await downloadFont(fontUrl);
    fontCache.set(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Generate OG image using Satori and Resvg
 */
export async function generateOgImage(
  data: OgImageData,
  options: OgGenerationOptions,
): Promise<OgGenerationResult> {
  const {
    outputPath,
    format = "jpg",
    quality = 85,
    width = OG_WIDTH,
    height = OG_HEIGHT,
  } = options;

  try {
    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Generate template
    const template = generateOgTemplate(data);

    // Load fonts - we need specific weights for the template
    const fontFamily = data.fontFamily || "Inter";
    const fonts: {
      name: string;
      data: Buffer;
      weight?: number;
      style?: string;
    }[] = [];

    // Load different font weights needed for the template
    const weights = [400, 600, 700, 800];
    for (const weight of weights) {
      const fontData = await loadFont(fontFamily, weight);
      if (fontData) {
        fonts.push({
          name: fontFamily,
          data: fontData,
          weight,
        });
      }

      // Load Vietnamese-capable variant for the same weight so diacritics render
      const vietnameseFontData = await loadVietnameseFont(fontFamily, weight);
      if (vietnameseFontData) {
        fonts.push({
          name: fontFamily,
          data: vietnameseFontData,
          weight,
        });
      }
    }

    // If no fonts were loaded, we can't generate the image
    if (fonts.length === 0) {
      throw new Error(
        `No fonts are loaded for ${fontFamily}. Unable to generate OG image.`,
      );
    }

    // Generate SVG using Satori
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const satoriOptions: any = {
      width,
      height,
    };

    if (fonts.length > 0) {
      satoriOptions.fonts = fonts;
    }

    const svg = await satori(template as React.ReactNode, satoriOptions);

    // Convert SVG to raster image using Resvg
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: "width",
        value: width,
      },
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // Convert to JPG if needed using sharp
    let finalBuffer: Buffer;
    const outputExt = path.extname(outputPath).toLowerCase();
    if (outputExt === ".jpg" || outputExt === ".jpeg") {
      finalBuffer = await sharp(pngBuffer)
        .jpeg({ quality: options.quality || 85, progressive: true })
        .toBuffer();
    } else {
      finalBuffer = pngBuffer;
    }

    await fs.writeFile(outputPath, finalBuffer);

    return {
      success: true,
      outputPath,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[mdsvr] OG image generation failed: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Batch generate OG images for multiple pages
 */
export async function batchGenerateOgImages(
  items: Array<{
    data: OgImageData;
    outputPath: string;
    urlPath: string;
  }>,
  format: "jpg" | "png" = "jpg",
  silent: boolean = false,
): Promise<{ generated: number; failed: number }> {
  let generated = 0;
  let failed = 0;

  for (const item of items) {
    const result = await generateOgImage(item.data, {
      outputPath: item.outputPath,
      format,
    });

    if (result.success) {
      generated++;
      if (!silent) {
        console.log(`  ✓ OG image: ${item.urlPath} → ${item.outputPath}`);
      }
    } else {
      failed++;
      if (!silent) {
        console.log(`  ✗ OG image failed: ${item.urlPath} (${result.error})`);
      }
    }
  }

  return { generated, failed };
}

/**
 * Get OG image output path for a URL path
 */
export function getOgImagePath(
  urlPath: string,
  outputDir: string,
  format: "jpg" | "png" = "jpg",
  basePath: string = "",
): string {
  // Normalize URL path and strip basePath if present
  let normalized = urlPath.replace(/\/$/, "");

  // Remove basePath prefix from urlPath if it exists
  // This ensures the file structure matches the URL structure
  const normalizedBase = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;
  if (normalizedBase && normalized.startsWith(normalizedBase)) {
    normalized = normalized.slice(normalizedBase.length);
  }

  const segments = normalized.split("/").filter(Boolean);

  if (segments.length === 0) {
    // Root path
    return path.join(outputDir, `index.${format}`);
  }

  // Create path: /og/docs/guides → /og/docs/guides.jpg
  // For directories ending with index, use index.jpg
  if (urlPath.endsWith("/")) {
    return path.join(outputDir, ...segments, `index.${format}`);
  }

  // For specific files: /guides/setup → /og/guides/setup.jpg
  return path.join(outputDir, ...segments, `index.${format}`);
}

/**
 * Get OG image URL for a page
 */
export function getOgImageUrl(
  urlPath: string,
  basePath: string,
  format: "jpg" | "png" = "jpg",
): string {
  const normalizedBase = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;

  // Normalize URL path and strip basePath if present
  let normalized = urlPath.replace(/\/$/, "");

  // Remove basePath prefix from urlPath if it exists
  // urlPath already includes basePath (e.g., /docs/3.-features/mdx)
  // We need to strip it to avoid double basePath
  if (normalizedBase && normalized.startsWith(normalizedBase)) {
    normalized = normalized.slice(normalizedBase.length);
  }

  const segments = normalized.split("/").filter(Boolean);

  if (segments.length === 0) {
    return `${normalizedBase}/public/og/index.${format}`;
  }

  return `${normalizedBase}/public/og/${segments.join("/")}/index.${format}`;
}
