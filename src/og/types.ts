// OG Image data types

export interface OgImageData {
  /** Page title (from frontmatter or extracted from H1) */
  title: string;
  /** Page description (from frontmatter or extracted from content) */
  description?: string;
  /** Site name */
  siteName: string;
  /** URL path */
  urlPath?: string;
  /** Accent color from settings */
  accentColor?: string;
  /** Font family */
  fontFamily?: string;
  /** Background color */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
}

export interface OgGenerationOptions {
  /** Output file path */
  outputPath: string;
  /** Image format */
  format: "jpg" | "png";
  /** Image quality (0-100) for JPG */
  quality?: number;
  /** Width of the image */
  width?: number;
  /** Height of the image */
  height?: number;
}

export interface OgSettings {
  /** Enable OG image generation */
  enabled: boolean;
  /** Template name (default: "default") */
  template: string;
  /** Image format */
  imageFormat: "jpg" | "png";
  /** Generate on serve mode */
  generateOnServe: boolean;
  /** Font family */
  fontFamily: string;
  /** Color scheme */
  colors: {
    background: string;
    text: string;
    accent: string;
  };
}

export interface OgGenerationResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}
