export interface ServeOptions {
  port?: number;
  host?: string;
  open?: boolean;
  silent?: boolean;
}

export interface ServerInstance {
  close(): Promise<void>;
  port: number;
  host: string;
  url: string;
}
