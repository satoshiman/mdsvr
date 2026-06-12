import { z } from "zod";
import {
  DEFAULT_SERVE_EXTENSIONS,
  DEFAULT_BLOCK_EXTENSIONS,
  DEFAULT_HIDDEN_FILES,
  DEFAULT_INDEX_FILES,
} from "./defaults.js";

export const LogoSchema = z.object({
  src: z.string(),
  alt: z.string().default("Logo"),
  href: z.string().default("/"),
});

export const SiteSchema = z.object({
  title: z.string().default("mdsvr Docs"),
  description: z.string().default(""),
  baseUrl: z.string().url().optional(),
  language: z.string().default("en"),
  logo: LogoSchema.optional(),
  favicon: z.string().optional(),
});

export const AppearanceSchema = z.object({
  defaultTheme: z.enum(["light", "dark", "system"]).default("system"),
  allowThemeToggle: z.boolean().default(true),
  accentColor: z.string().default("#0969da"),
  codeTheme: z
    .object({
      light: z.string().default("github"),
      dark: z.string().default("github-dark"),
    })
    .default({}),
  fontFamily: z
    .object({
      body: z.string().optional(),
      code: z.string().optional(),
      heading: z.string().nullable().optional(),
    })
    .default({}),
});

export const NavigationSchema = z.object({
  sidebar: z
    .object({
      enabled: z.boolean().default(true),
      autoGenerate: z.boolean().default(true),
      showFileCount: z.boolean().default(false),
      collapsible: z.boolean().default(true),
      defaultOpen: z.boolean().default(true),
      depth: z.number().default(2),
      docsOnly: z.boolean().default(false),
    })
    .default({}),
  breadcrumbs: z.boolean().default(true),
  prevNextLinks: z.boolean().default(true),
  tocEnabled: z.boolean().default(true),
  tocMaxDepth: z.number().default(3),
  editOnGithub: z
    .object({
      enabled: z.boolean().default(false),
      repo: z.string().optional(),
      branch: z.string().default("main"),
      docsDir: z.string().default("docs/"),
    })
    .default({}),
});

export const SearchSchema = z.object({
  enabled: z.boolean().default(true),
  placeholder: z.string().default("Search docs..."),
  maxResults: z.number().default(10),
});

export const SeoSchema = z.object({
  titleTemplate: z.string().default("%s"),
  defaultImage: z.string().optional(),
  twitterCard: z
    .enum(["summary", "summary_large_image"])
    .default("summary_large_image"),
  twitterSite: z.string().optional(),
  noIndex: z.boolean().default(false),
  generateSitemap: z.boolean().default(true),
  generateRssFeed: z.boolean().default(false),
  rss: z
    .object({
      title: z.string(),
      feedUrl: z.string().default("/feed.xml"),
      siteUrl: z.string().url(),
    })
    .optional(),
});

export const FilesSchema = z.object({
  extensions: z
    .object({
      serve: z.array(z.string()).default(DEFAULT_SERVE_EXTENSIONS),
      block: z.array(z.string()).default(DEFAULT_BLOCK_EXTENSIONS),
      hidden: z.array(z.string()).default(DEFAULT_HIDDEN_FILES),
    })
    .default({}),
  indexFiles: z.array(z.string()).default(DEFAULT_INDEX_FILES),
  ignorePatterns: z.array(z.string()).default([]),
});

export const MdxSchema = z.object({
  enabled: z.boolean().default(true),
  components: z.record(z.boolean()).default({}),
  remarkPlugins: z.array(z.string()).default([]),
  rehypePlugins: z.array(z.string()).default([]),
});

export const FooterSchema = z.object({
  text: z.string().default("Built with mdsvr"),
  links: z
    .array(
      z.object({
        label: z.string(),
        href: z.string(),
      }),
    )
    .default([]),
});

export const SettingsSchema = z.object({
  $schema: z.string().optional(),
  site: SiteSchema.default({}),
  appearance: AppearanceSchema.default({}),
  seo: SeoSchema.default({}),
  navigation: NavigationSchema.default({}),
  search: SearchSchema.default({}),
  files: FilesSchema.default({}),
  mdx: MdxSchema.default({}),
  footer: FooterSchema.default({}),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type Logo = z.infer<typeof LogoSchema>;
export type Site = z.infer<typeof SiteSchema>;
export type Appearance = z.infer<typeof AppearanceSchema>;
export type Navigation = z.infer<typeof NavigationSchema>;
export type Search = z.infer<typeof SearchSchema>;
export type Seo = z.infer<typeof SeoSchema>;
export type Files = z.infer<typeof FilesSchema>;
export type Mdx = z.infer<typeof MdxSchema>;
export type Footer = z.infer<typeof FooterSchema>;
