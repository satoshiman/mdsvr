import { watch, type FSWatcher } from "node:fs";
import path from "node:path";
import { promises as fs } from "node:fs";
import { SettingsSchema, type Settings } from "./schema.js";

export async function loadSettings(rootDir: string): Promise<Settings> {
  const settingsPath = path.join(rootDir, "_mdsvr/settings.json");
  try {
    const raw = await fs.readFile(settingsPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = SettingsSchema.safeParse(parsed);
    if (!result.success) {
      console.warn(
        "[mdsvr] _mdsvr/settings.json validation errors:",
        result.error.flatten(),
      );
      return SettingsSchema.parse({}); // fallback to defaults
    }
    warnOnInvalidAnalyticsIds(result.data);
    return result.data;
  } catch {
    return SettingsSchema.parse({}); // no _mdsvr/settings.json → all defaults
  }
}

const ANALYTICS_ID_PATTERNS: [keyof Settings["analytics"], RegExp][] = [
  ["googleAnalytics", /^G-[A-Z0-9]+$/],
  ["googleTagManager", /^GTM-[A-Z0-9]+$/],
];

/** Warn (never fail) when configured analytics IDs look malformed. */
function warnOnInvalidAnalyticsIds(settings: Settings): void {
  for (const [key, pattern] of ANALYTICS_ID_PATTERNS) {
    const value = settings.analytics[key];
    if (typeof value === "string" && value && !pattern.test(value)) {
      console.warn(
        `[mdsvr] analytics.${key}: "${value}" does not match expected format ${pattern}`,
      );
    }
  }
}

export function watchSettings(
  rootDir: string,
  onChange: (s: Settings) => void,
): FSWatcher {
  // Re-load on file change without restarting server
  return watch(path.join(rootDir, "_mdsvr/settings.json"), async () => {
    const newSettings = await loadSettings(rootDir);
    onChange(newSettings);
  });
}

export async function validateSettingsFile(
  rootDir: string,
): Promise<{ valid: boolean; errors?: string[] }> {
  const settingsPath = path.join(rootDir, "_mdsvr/settings.json");
  try {
    const raw = await fs.readFile(settingsPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = SettingsSchema.safeParse(parsed);
    if (!result.success) {
      const errors = result.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      );
      return { valid: false, errors };
    }
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      errors: [
        err instanceof Error
          ? err.message
          : "Failed to read _mdsvr/settings.json",
      ],
    };
  }
}

export function generateDefaultSettings(): object {
  return {
    $schema: "https://mdsvr.js.org/schema/v2.json",
    site: {
      title: "My Docs",
      description: "Project documentation",
      language: "en",
    },
    appearance: {
      defaultTheme: "system",
      allowThemeToggle: true,
      accentColor: "#0969da",
      codeTheme: {
        light: "github",
        dark: "github-dark",
      },
    },
    navigation: {
      sidebar: {
        enabled: true,
        autoGenerate: true,
      },
      tocEnabled: true,
    },
    search: {
      enabled: true,
    },
    mdx: {
      enabled: true,
    },
    seo: {
      structuredData: true,
      og: {
        enabled: true,
      },
    },
  };
}

export { SettingsSchema } from "./schema.js";
export type {
  Settings,
  Logo,
  SiteAuthor,
  Site,
  Appearance,
  Navigation,
  Search,
  Seo,
  Files,
  Mdx,
  Footer,
  Generate,
} from "./schema.js";
