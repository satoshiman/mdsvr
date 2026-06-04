import type { Settings } from "./settings/index.js";

export interface ServeOptions {
  port?: number;
  host?: string;
  open?: boolean;
  silent?: boolean;
  watchSettings?: boolean;
}

export interface ServerInstance {
  close(): Promise<void>;
  port: number;
  host: string;
  url: string;
  settings: Settings;
  reloadSettings(): Promise<void>;
}
