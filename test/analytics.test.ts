import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { renderPage, type TemplateParams } from "../src/template/index.js";
import {
  SettingsSchema,
  loadSettings,
  type Settings,
} from "../src/settings/index.js";
import { resolveSeoData } from "../src/seo/metadata.js";
import {
  generateSitemapFromPages,
  type SitemapPage,
} from "../src/generators/sitemap.js";

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

describe("analytics & verification", () => {
  describe("analytics head tags", () => {
    it("emits nothing when analytics is not configured", () => {
      const html = render();
      assert.ok(!html.includes("googletagmanager.com"));
      assert.ok(!html.includes("clarity.ms"));
      assert.ok(!html.includes("plausible"));
    });

    it("emits the GA4 gtag snippet", () => {
      const html = render({
        settings: makeSettings({
          analytics: { googleAnalytics: "G-ABC12345" },
        }),
      });
      assert.ok(
        html.includes(
          'src="https://www.googletagmanager.com/gtag/js?id=G-ABC12345"',
        ),
      );
      assert.ok(html.includes("gtag('config', 'G-ABC12345')"));
    });

    it("emits the GTM head script and a noscript right after <body>", () => {
      const html = render({
        settings: makeSettings({
          analytics: { googleTagManager: "GTM-ABC123" },
        }),
      });
      assert.ok(html.includes("googletagmanager.com/gtm.js?id="));
      const bodyIdx = html.indexOf("<body>");
      const noscriptIdx = html.indexOf(
        "googletagmanager.com/ns.html?id=GTM-ABC123",
      );
      assert.ok(bodyIdx !== -1 && noscriptIdx !== -1);
      // The noscript iframe must be the first element inside <body>
      const between = html.slice(bodyIdx + "<body>".length, noscriptIdx);
      assert.ok(!between.includes("<header"), "noscript must precede header");
      assert.ok(!/<(div|main|header|nav)/.test(between));
    });

    it("emits the Clarity snippet", () => {
      const html = render({
        settings: makeSettings({ analytics: { clarity: "abc123" } }),
      });
      assert.ok(html.includes("https://www.clarity.ms/tag/"));
      assert.ok(html.includes('"abc123"'));
    });

    it("emits Plausible and Umami scripts", () => {
      const html = render({
        settings: makeSettings({
          analytics: {
            plausible: { domain: "docs.example.com" },
            umami: {
              websiteId: "w-1",
              scriptSrc: "https://umami.example.com/script.js",
            },
          },
        }),
      });
      assert.ok(
        html.includes(
          'data-domain="docs.example.com" src="https://plausible.io/js/script.js"',
        ),
      );
      assert.ok(
        html.includes(
          'data-website-id="w-1" src="https://umami.example.com/script.js"',
        ),
      );
    });

    it("appends customHead snippets verbatim", () => {
      const html = render({
        settings: makeSettings({
          analytics: { customHead: ['<meta name="x-custom" content="42">'] },
        }),
      });
      assert.ok(html.includes('<meta name="x-custom" content="42">'));
    });

    it("warns on malformed IDs when loading settings (no crash)", async () => {
      const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdsvr-an-"));
      try {
        await fs.mkdir(path.join(rootDir, "_mdsvr"));
        await fs.writeFile(
          path.join(rootDir, "_mdsvr/settings.json"),
          JSON.stringify({ analytics: { googleAnalytics: "not-a-ga-id" } }),
        );
        const warnings: string[] = [];
        const orig = console.warn;
        console.warn = (...args: unknown[]) => warnings.push(String(args[0]));
        try {
          const settings = await loadSettings(rootDir);
          assert.strictEqual(settings.analytics.googleAnalytics, "not-a-ga-id");
        } finally {
          console.warn = orig;
        }
        assert.ok(
          warnings.some((w) => w.includes("analytics.googleAnalytics")),
        );
      } finally {
        await fs.rm(rootDir, { recursive: true, force: true });
      }
    });
  });

  describe("seo.verification", () => {
    it("emits verification meta tags for each provider", () => {
      const html = render({
        settings: makeSettings({
          seo: {
            verification: {
              google: "g-123",
              bing: "b-456",
              yandex: "y-789",
              pinterest: "p-000",
              naver: "n-111",
            },
          },
        }),
      });
      assert.ok(
        html.includes('name="google-site-verification" content="g-123"'),
      );
      assert.ok(html.includes('name="msvalidate.01" content="b-456"'));
      assert.ok(html.includes('name="yandex-verification" content="y-789"'));
      assert.ok(html.includes('name="p:domain_verify" content="p-000"'));
      assert.ok(
        html.includes('name="naver-site-verification" content="n-111"'),
      );
    });

    it("escapes verification values", () => {
      const html = render({
        settings: makeSettings({
          seo: { verification: { google: 'x"><script>' } },
        }),
      });
      assert.ok(html.includes("x&quot;&gt;&lt;script&gt;"));
      assert.ok(!html.includes('content="x"><script>"'));
    });
  });

  describe("directory noindex", () => {
    it("marks directory pages noindex when seo.noIndexDirectoryPages is on", () => {
      const seo = resolveSeoData({
        title: "Listing",
        urlPath: "/docs/",
        kind: "directory",
        settings: makeSettings({ seo: { noIndexDirectoryPages: true } }),
      });
      assert.strictEqual(seo.noIndex, true);
    });

    it("keeps directory pages indexed by default", () => {
      const seo = resolveSeoData({
        title: "Listing",
        urlPath: "/docs/",
        kind: "directory",
        settings: makeSettings(),
      });
      assert.strictEqual(seo.noIndex, false);
    });
  });
});

describe("seo metadata enrichment", () => {
  it("emits og:locale derived from site.language", () => {
    const html = render({
      settings: makeSettings({ site: { language: "pt-BR" } }),
    });
    assert.ok(html.includes('<meta property="og:locale" content="pt_BR">'));
  });

  it("emits og:image dimensions for generated OG images", () => {
    const html = render({
      settings: makeSettings({ site: { baseUrl: "https://x.dev" } }),
      isStaticExport: true,
    });
    assert.ok(html.includes('<meta property="og:image:width" content="1200">'));
    assert.ok(html.includes('<meta property="og:image:height" content="630">'));
  });

  it("emits a SearchAction in WebSite JSON-LD when search is enabled", () => {
    const html = render({
      settings: makeSettings({ site: { baseUrl: "https://x.dev" } }),
      urlPath: "/",
    });
    const match = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    assert.ok(match);
    const ld = JSON.parse(match[1]);
    const site = ld["@graph"].find(
      (n: Record<string, unknown>) => n["@type"] === "WebSite",
    );
    assert.ok(site);
    assert.strictEqual(site.potentialAction["@type"], "SearchAction");
    assert.ok(
      site.potentialAction.target.urlTemplate.includes(
        "?q={search_term_string}",
      ),
    );
  });

  it("excludes noindex directory pages from the sitemap", () => {
    const pages: SitemapPage[] = [
      { urlPath: "/a/", noIndex: false },
      { urlPath: "/auto/", noIndex: true },
    ];
    const xml = generateSitemapFromPages(
      pages,
      makeSettings({ site: { baseUrl: "https://x.dev" } }),
    );
    assert.ok(xml);
    assert.ok(xml.includes("/a/"));
    assert.ok(!xml.includes("/auto/"));
  });
});
