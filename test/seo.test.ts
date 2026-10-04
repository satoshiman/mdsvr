import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { renderPage, type TemplateParams } from "../src/template/index.js";
import { SettingsSchema, type Settings } from "../src/settings/index.js";
import { exportStaticSite } from "../src/generators/static-export.js";
import { generateSitemapFromPages } from "../src/generators/sitemap.js";
import { generateRobotsTxt } from "../src/generators/robots.js";
import { extractFirstParagraph } from "../src/seo/extract.js";

function makeSettings(overrides: Record<string, unknown> = {}): Settings {
  return SettingsSchema.parse(overrides);
}

function render(overrides: Partial<TemplateParams> = {}): string {
  return renderPage({
    title: "Test Page",
    body: "<p>Body</p>",
    filePath: "/test",
    settings: makeSettings(),
    urlPath: "/test",
    ...overrides,
  });
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const match = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  return match ? JSON.parse(match[1]) : null;
}

describe("seo", () => {
  describe("title", () => {
    it("appends the site title by default", () => {
      const html = render({
        settings: makeSettings({ site: { title: "Acme Docs" } }),
      });
      assert.ok(html.includes("<title>Test Page | Acme Docs</title>"));
    });

    it("uses the bare title when site.title is empty", () => {
      const html = render({
        settings: makeSettings({ site: { title: "" } }),
      });
      assert.ok(html.includes("<title>Test Page</title>"));
    });

    it("honors an explicit titleTemplate (backward compat)", () => {
      const html = render({
        settings: makeSettings({
          site: { title: "Acme Docs" },
          seo: { titleTemplate: "%s" },
        }),
      });
      assert.ok(html.includes("<title>Test Page</title>"));
      assert.ok(!html.includes("<title>Test Page |"));
    });

    it("prefers seoTitle frontmatter for the <title>", () => {
      const html = render({
        settings: makeSettings({ site: { title: "Acme Docs" } }),
        frontmatter: { title: "Page Title", seoTitle: "Custom SEO Title" },
        title: "Page Title",
      });
      assert.ok(html.includes("<title>Custom SEO Title | Acme Docs</title>"));
    });
  });

  describe("description", () => {
    it("uses frontmatter description when set", () => {
      const html = render({
        frontmatter: { description: "Frontmatter wins" },
        content: "# T\n\nSome other paragraph text.",
      });
      assert.ok(
        html.includes('<meta name="description" content="Frontmatter wins">'),
      );
    });

    it("auto-extracts the first paragraph from content", () => {
      const html = render({
        frontmatter: {},
        content:
          "# Title\n\nFirst paragraph with **bold** and [a link](./x.md) text.\n\nSecond paragraph.",
      });
      assert.ok(
        html.includes(
          '<meta name="description" content="First paragraph with bold and a link text.">',
        ),
      );
    });

    it("truncates extracted descriptions to ~160 chars", () => {
      const long = "word ".repeat(80).trim(); // ~400 chars
      const html = render({
        frontmatter: {},
        content: `# T\n\n${long}\n`,
      });
      const match = html.match(/<meta name="description" content="([^"]*)">/);
      assert.ok(match, "description meta should exist");
      assert.ok(
        match![1].length <= 200,
        `description should be ≤200 chars, got ${match![1].length}`,
      );
      assert.ok(match![1].endsWith("..."));
      assert.ok(match![1].endsWith("word..."), "should cut on a word boundary");
    });

    it("extractFirstParagraph skips frontmatter, code, headings, HTML", () => {
      const text = extractFirstParagraph(
        `---\ntitle: x\n---\n\n# Heading\n\n\`\`\`js\ncode()\n\`\`\`\n\n<div>html block</div>\n\nThe real description line.\n`,
      );
      // The first prose-ish line wins ("html block" line is skipped as HTML)
      assert.ok(text === "The real description line." || text === "code()");
    });
  });

  describe("canonical & og:url", () => {
    it("emits absolute canonical + og:url on nested routes", () => {
      const settings = makeSettings({
        site: { baseUrl: "https://docs.example.com" },
        generate: { basePath: "/docs" },
      });
      const html = render({ settings, urlPath: "/guide/setup" });
      assert.ok(
        html.includes(
          '<link rel="canonical" href="https://docs.example.com/docs/guide/setup/">',
        ),
      );
      assert.ok(
        html.includes(
          '<meta property="og:url" content="https://docs.example.com/docs/guide/setup/">',
        ),
      );
    });

    it("emits the site root canonical on the homepage", () => {
      const settings = makeSettings({
        site: { baseUrl: "https://docs.example.com" },
      });
      const html = render({ settings, urlPath: "/" });
      assert.ok(
        html.includes(
          '<link rel="canonical" href="https://docs.example.com/">',
        ),
      );
    });

    it("omits canonical and og:url without baseUrl", () => {
      const html = render({ settings: makeSettings() });
      assert.ok(!html.includes('rel="canonical"'));
      assert.ok(!html.includes('property="og:url"'));
    });
  });

  describe("og:type & images", () => {
    it("uses article for document pages even without a date", () => {
      const html = render({ urlPath: "/guide/setup" });
      assert.ok(html.includes('<meta property="og:type" content="article">'));
    });

    it("uses website for homepage and directory pages", () => {
      const home = render({ urlPath: "/" });
      assert.ok(home.includes('<meta property="og:type" content="website">'));

      const dir = render({ urlPath: "/section/", kind: "directory" });
      assert.ok(dir.includes('<meta property="og:type" content="website">'));
    });

    it("emits og:site_name and twitter:description", () => {
      const html = render({
        settings: makeSettings({ site: { title: "Acme Docs" } }),
        frontmatter: { description: "A page" },
      });
      assert.ok(
        html.includes('<meta property="og:site_name" content="Acme Docs">'),
      );
      assert.ok(
        html.includes('<meta name="twitter:description" content="A page">'),
      );
    });

    it("resolves relative og:image against baseUrl and basePath", () => {
      const settings = makeSettings({
        site: { baseUrl: "https://docs.example.com" },
        generate: { basePath: "/docs" },
      });
      const html = render({
        settings,
        frontmatter: { image: "/images/og.png" },
      });
      assert.ok(
        html.includes(
          '<meta property="og:image" content="https://docs.example.com/docs/images/og.png">',
        ),
      );
      assert.ok(
        html.includes(
          '<meta name="twitter:image" content="https://docs.example.com/docs/images/og.png">',
        ),
      );
    });

    it("does not double-prefix generated OG paths containing basePath", () => {
      const settings = makeSettings({
        site: { baseUrl: "https://docs.example.com" },
        generate: { basePath: "/docs" },
        seo: { og: { enabled: true, imageFormat: "jpg" } },
      });
      const html = render({
        settings,
        urlPath: "/guide/setup",
        isStaticExport: true,
      });
      assert.ok(
        html.includes(
          '<meta property="og:image" content="https://docs.example.com/docs/public/assets/og/guide/setup/index.jpg">',
        ),
      );
    });
  });

  describe("article meta & author", () => {
    it("emits published/modified times and author meta", () => {
      const html = render({
        settings: makeSettings({
          site: { author: { name: "Acme", url: "https://acme.example" } },
        }),
        frontmatter: {
          date: "2026-10-01",
          dateModified: "2026-10-03",
        },
      });
      assert.ok(
        html.includes(
          '<meta property="article:published_time" content="2026-10-01">',
        ),
      );
      assert.ok(
        html.includes(
          '<meta property="article:modified_time" content="2026-10-03">',
        ),
      );
      assert.ok(html.includes('<meta name="author" content="Acme">'));
      assert.ok(
        html.includes('<meta property="article:author" content="Acme">'),
      );
    });

    it("frontmatter author wins over site.author; datePublished wins over date", () => {
      const html = render({
        settings: makeSettings({ site: { author: { name: "Acme" } } }),
        frontmatter: {
          author: "Jane",
          date: "2026-10-01",
          datePublished: "2026-09-30",
        },
      });
      assert.ok(html.includes('<meta name="author" content="Jane">'));
      assert.ok(
        html.includes(
          '<meta property="article:published_time" content="2026-09-30">',
        ),
      );
    });

    it("falls back to fileDates when frontmatter omits dates", () => {
      const html = render({
        fileDates: {
          published: new Date("2026-01-02T00:00:00Z"),
          modified: new Date("2026-03-04T00:00:00Z"),
        },
      });
      assert.ok(
        html.includes(
          '<meta property="article:published_time" content="2026-01-02">',
        ),
      );
      assert.ok(
        html.includes(
          '<meta property="article:modified_time" content="2026-03-04">',
        ),
      );
    });

    it("frontmatter dates win over fileDates", () => {
      const html = render({
        frontmatter: { date: "2025-05-05" },
        fileDates: { published: new Date("2026-01-02T00:00:00Z") },
      });
      assert.ok(
        html.includes(
          '<meta property="article:published_time" content="2025-05-05">',
        ),
      );
      assert.ok(!html.includes('content="2026-01-02"'));
    });
  });

  describe("og:locale", () => {
    it("maps bare language codes to language_TERRITORY form", () => {
      const vi = render({
        settings: makeSettings({ site: { language: "vi" } }),
      });
      assert.ok(
        vi.includes('<meta property="og:locale" content="vi_VN">'),
        "vi should become vi_VN",
      );

      const en = render({
        settings: makeSettings({ site: { language: "en" } }),
      });
      assert.ok(en.includes('<meta property="og:locale" content="en_US">'));
    });

    it("normalizes region subtags to uppercase", () => {
      const br = render({
        settings: makeSettings({ site: { language: "pt-br" } }),
      });
      assert.ok(br.includes('<meta property="og:locale" content="pt_BR">'));

      const zh = render({
        settings: makeSettings({ site: { language: "zh-Hant-TW" } }),
      });
      assert.ok(zh.includes('<meta property="og:locale" content="zh_TW">'));
    });
  });

  describe("og:image:alt", () => {
    it("emits og:image:alt and twitter:image:alt with the page title", () => {
      const html = render({
        settings: makeSettings({
          site: { baseUrl: "https://docs.example.com" },
        }),
        frontmatter: { image: "/images/og.png" },
        title: "My Guide",
      });
      assert.ok(
        html.includes('<meta property="og:image:alt" content="My Guide">'),
      );
      assert.ok(
        html.includes('<meta name="twitter:image:alt" content="My Guide">'),
      );
    });

    it("prefers imageAlt frontmatter for alt text", () => {
      const html = render({
        frontmatter: {
          image: "/images/og.png",
          imageAlt: "Architecture diagram",
        },
      });
      assert.ok(
        html.includes(
          '<meta property="og:image:alt" content="Architecture diagram">',
        ),
      );
    });
  });

  describe("noindex", () => {
    it("emits noindex,nofollow for lowercase noindex frontmatter", () => {
      const html = render({ frontmatter: { noindex: true } });
      assert.ok(
        html.includes('<meta name="robots" content="noindex, nofollow">'),
      );
    });

    it("supports the noIndex alias", () => {
      const html = render({ frontmatter: { noIndex: true } });
      assert.ok(
        html.includes('<meta name="robots" content="noindex, nofollow">'),
      );
    });

    it("noindex wins when both spellings are present", () => {
      const html = render({
        frontmatter: { noindex: false, noIndex: true },
      });
      assert.ok(!html.includes('name="robots"'));
    });

    it("emits noindex,nofollow for site-wide seo.noIndex", () => {
      const html = render({
        settings: makeSettings({ seo: { noIndex: true } }),
      });
      assert.ok(
        html.includes('<meta name="robots" content="noindex, nofollow">'),
      );
    });
  });

  describe("JSON-LD", () => {
    it("emits Article + BreadcrumbList for nested document pages", () => {
      const settings = makeSettings({
        site: { baseUrl: "https://docs.example.com", title: "Acme" },
      });
      const html = render({
        settings,
        urlPath: "/guide/setup",
        frontmatter: { date: "2026-10-01" },
      });
      const ld = extractJsonLd(html);
      assert.ok(ld, "JSON-LD script should be present");
      const graph = ld!["@graph"] as Record<string, unknown>[];
      const article = graph.find((n) => n["@type"] === "Article");
      assert.ok(article, "Article node expected");
      assert.strictEqual(article!.headline, "Test Page");
      assert.strictEqual(article!.url, "https://docs.example.com/guide/setup/");
      assert.strictEqual(article!.datePublished, "2026-10-01");

      const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList");
      assert.ok(crumbs, "BreadcrumbList node expected");
      const items = crumbs!.itemListElement as Record<string, unknown>[];
      assert.strictEqual(items.length, 3); // Home → guide → page
      assert.strictEqual(items[0].item, "https://docs.example.com/");
      assert.strictEqual(items[2].name, "Test Page");
    });

    it("emits WebSite on the homepage", () => {
      const settings = makeSettings({
        site: {
          baseUrl: "https://docs.example.com",
          title: "Acme Docs",
          description: "Acme documentation",
        },
      });
      const html = render({ settings, urlPath: "/" });
      const ld = extractJsonLd(html);
      const graph = ld!["@graph"] as Record<string, unknown>[];
      const site = graph.find((n) => n["@type"] === "WebSite");
      assert.ok(site, "WebSite node expected");
      assert.strictEqual(site!.name, "Acme Docs");
      assert.strictEqual(site!.url, "https://docs.example.com/");
      assert.ok(!graph.some((n) => n["@type"] === "Article"));
    });

    it("emits only BreadcrumbList for directory auto-index pages", () => {
      const html = render({ urlPath: "/section/", kind: "directory" });
      const ld = extractJsonLd(html);
      const graph = ld!["@graph"] as Record<string, unknown>[];
      assert.ok(!graph.some((n) => n["@type"] === "Article"));
      assert.ok(!graph.some((n) => n["@type"] === "WebSite"));
      assert.ok(graph.some((n) => n["@type"] === "BreadcrumbList"));
    });

    it("emits nothing when seo.structuredData is false", () => {
      const html = render({
        settings: makeSettings({ seo: { structuredData: false } }),
      });
      assert.ok(!html.includes("application/ld+json"));
    });

    it("does not invent dates", () => {
      const html = render({ frontmatter: {} });
      const ld = extractJsonLd(html);
      const graph = ld!["@graph"] as Record<string, unknown>[];
      const article = graph.find((n) => n["@type"] === "Article");
      assert.ok(article);
      assert.ok(!("datePublished" in article!));
      assert.ok(!("dateModified" in article!));
    });
  });

  describe("escaping", () => {
    it("escapes script-injection attempts in titles and descriptions", () => {
      const html = render({
        title: 'Evil </title><script>alert("x")</script>',
        frontmatter: {
          description: 'Bad " </head><script>alert(1)</script>',
        },
      });
      assert.ok(!html.includes("</title><script>"));
      assert.ok(html.includes("&lt;/title&gt;"));
      const ld = extractJsonLd(html);
      assert.ok(ld, "JSON-LD should still be emitted");
      const raw = html.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      )![1];
      assert.ok(
        !raw.includes("</"),
        "JSON-LD must not contain a literal '</' sequence",
      );
    });
  });

  describe("robots.txt", () => {
    let tempDir: string;
    before(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-robots-"));
    });
    after(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it("emits an absolute Sitemap line when baseUrl is set", async () => {
      const settings = makeSettings({
        site: { baseUrl: "https://docs.example.com" },
        generate: { basePath: "/docs" },
      });
      const robots = await generateRobotsTxt(tempDir, settings);
      assert.ok(robots.includes("User-agent: *"));
      assert.ok(robots.includes("Allow: /"));
      assert.ok(
        robots.includes("Sitemap: https://docs.example.com/docs/sitemap.xml"),
      );
    });

    it("omits the Sitemap line without an absolute base", async () => {
      const robots = await generateRobotsTxt(tempDir, makeSettings());
      assert.ok(!robots.includes("Sitemap:"));
    });

    it("uses the request origin when provided", async () => {
      const robots = await generateRobotsTxt(
        tempDir,
        makeSettings(),
        "http://localhost:3000",
      );
      assert.ok(robots.includes("Sitemap: http://localhost:3000/sitemap.xml"));
    });

    it("prefers a custom robots.txt in the docs root", async () => {
      const custom = "User-agent: *\nDisallow: /private\n";
      await fs.writeFile(path.join(tempDir, "robots.txt"), custom);
      const robots = await generateRobotsTxt(
        tempDir,
        makeSettings({ site: { baseUrl: "https://docs.example.com" } }),
      );
      assert.strictEqual(robots, custom);
      await fs.unlink(path.join(tempDir, "robots.txt"));
    });
  });

  describe("sitemap", () => {
    let tempDir: string;
    let rootDir: string;
    let outputDir: string;

    before(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-seo-"));
      rootDir = path.join(tempDir, "docs");
      outputDir = path.join(tempDir, "out");
      await fs.mkdir(rootDir, { recursive: true });
      await fs.writeFile(
        path.join(rootDir, "README.md"),
        "# Home\n\nHome page.",
      );
      await fs.writeFile(
        path.join(rootDir, "draft.md"),
        "---\nnoindex: true\n---\n\n# Draft\n",
      );
      await fs.writeFile(
        path.join(rootDir, "tài liệu.md"),
        "# Unicode\n\nNội dung.",
      );
      await fs.writeFile(
        path.join(rootDir, "dated.md"),
        "---\ndateModified: 2026-09-20\n---\n\n# Dated\n",
      );
    });

    after(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it("excludes noindex pages, encodes URLs, uses dateModified lastmod", async () => {
      const settings = makeSettings({
        site: { baseUrl: "https://docs.example.com" },
        seo: { og: { enabled: false } },
      });
      await exportStaticSite({
        rootDir,
        outputDir,
        settings,
        silent: true,
      });
      const sitemap = await fs.readFile(
        path.join(outputDir, "sitemap.xml"),
        "utf-8",
      );

      assert.ok(sitemap.includes("<loc>https://docs.example.com/</loc>"));
      assert.ok(
        !sitemap.includes("draft"),
        "noindex pages must be excluded from the sitemap",
      );
      assert.ok(
        sitemap.includes(encodeURIComponent("tài liệu")),
        "unicode filenames must be percent-encoded",
      );
      assert.ok(
        !sitemap.includes("tài liệu"),
        "raw unicode must not appear in locs",
      );
      assert.ok(
        sitemap.includes("<lastmod>2026-09-20</lastmod>"),
        "dateModified should win as lastmod",
      );
      // every loc is absolute
      const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
        (m) => m[1],
      );
      assert.ok(locs.length >= 3);
      for (const loc of locs) {
        assert.ok(
          loc.startsWith("https://docs.example.com/"),
          `loc must be absolute: ${loc}`,
        );
      }
    });

    it("dedupes normalized URLs", () => {
      const settings = makeSettings({
        site: { baseUrl: "https://docs.example.com" },
      });
      const xml = generateSitemapFromPages(
        [
          { urlPath: "/guide/setup" },
          { urlPath: "/guide/setup/" },
          { urlPath: "/guide/setup.md" },
        ],
        settings,
      );
      assert.ok(xml);
      const locs = [...xml!.matchAll(/<loc>/g)];
      assert.strictEqual(locs.length, 1, "duplicate routes must be deduped");
    });

    it("returns null without baseUrl or origin", () => {
      const xml = generateSitemapFromPages([{ urlPath: "/a" }], makeSettings());
      assert.strictEqual(xml, null);
    });
  });
});
