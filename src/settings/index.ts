import { watch } from "node:fs";
import path from "node:path";
import { promises as fs } from "node:fs";
import { SettingsSchema, type Settings } from "./schema.js";

export async function loadSettings(rootDir: string): Promise<Settings> {
  const settingsPath = path.join(rootDir, "settings.json");
  try {
    const raw = await fs.readFile(settingsPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = SettingsSchema.safeParse(parsed);
    if (!result.success) {
      console.warn(
        "[mdsvr] settings.json validation errors:",
        result.error.flatten(),
      );
      return SettingsSchema.parse({}); // fallback to defaults
    }
    return result.data;
  } catch {
    return SettingsSchema.parse({}); // no settings.json → all defaults
  }
}

export function watchSettings(
  rootDir: string,
  onChange: (s: Settings) => void,
): void {
  // Re-load on file change without restarting server
  watch(path.join(rootDir, "settings.json"), async () => {
    const newSettings = await loadSettings(rootDir);
    onChange(newSettings);
  });
}

export async function validateSettingsFile(
  rootDir: string,
): Promise<{ valid: boolean; errors?: string[] }> {
  const settingsPath = path.join(rootDir, "settings.json");
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
        err instanceof Error ? err.message : "Failed to read settings.json",
      ],
    };
  }
}

export function generateDefaultSettings(): object {
  return {
    $schema: "https://mdsvr.dev/schema/v2.json",
    site: {
      title: "My Docs",
      description: "Project documentation",
      language: "en",
    },
    appearance: {
      defaultTheme: "system",
      allowThemeToggle: true,
      accentColor: "#0969da",
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
  };
}

export { SettingsSchema } from "./schema.js";
export type {
  Settings,
  Logo,
  Site,
  Appearance,
  Navigation,
  Search,
  Seo,
  Files,
  Mdx,
  Footer,
} from "./schema.js";
