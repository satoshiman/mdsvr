// OG Image template using Satori's JSX-like syntax
// This file is processed by Satori to generate SVG

import type { OgImageData } from "./types.js";

// OG Image dimensions
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// Font fallback stack
const FONT_STACK = [
  "Inter",
  "system-ui",
  "-apple-system",
  "BlinkMacSystemFont",
  "Segoe UI",
  "Roboto",
  "sans-serif",
];

// Monospace font for URL
const MONO_FONT = [
  "JetBrains Mono",
  "Fira Code",
  "SF Mono",
  "Monaco",
  "Consolas",
  "monospace",
];

/**
 * Truncate text to a maximum length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + "...";
}

/**
 * Generate the OG image JSX structure for Satori
 */
export function generateOgTemplate(data: OgImageData): JSX.Element {
  const {
    title,
    description,
    siteName,
    urlPath,
    accentColor = "#0969da",
    fontFamily = "Inter",
    backgroundColor = "#0a0a0f",
    textColor = "#ffffff",
  } = data;

  const truncatedTitle = truncate(title, 120);
  const truncatedDesc = description ? truncate(description, 200) : "";

  // Create font family string
  const fonts = [fontFamily, ...FONT_STACK.filter((f) => f !== fontFamily)];
  const fontFamilyString = fonts.join(", ");
  const monoFontString = MONO_FONT.join(", ");

  return (
    <div
      style={{
        width: OG_WIDTH,
        height: OG_HEIGHT,
        display: "flex",
        flexDirection: "column",
        background: backgroundColor,
        fontFamily: fontFamilyString,
        color: textColor,
        padding: "60px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background gradient decoration */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 600,
          height: 600,
          background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
          borderRadius: "50%",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: -150,
          left: -100,
          width: 500,
          height: 500,
          background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`,
          borderRadius: "50%",
        }}
      />

      {/* Accent line at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}80 50%, ${accentColor}40 100%)`,
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
        }}
      >
        {/* Site name */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: accentColor,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 20,
          }}
        >
          {siteName}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: description ? 24 : 0,
            color: textColor,
          }}
        >
          {truncatedTitle}
        </div>

        {/* Description */}
        {truncatedDesc && (
          <div
            style={{
              fontSize: 28,
              fontWeight: 400,
              lineHeight: 1.4,
              color: `${textColor}cc`,
              maxWidth: 900,
            }}
          >
            {truncatedDesc}
          </div>
        )}
      </div>

      {/* Footer with URL path */}
      {urlPath && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: "auto",
            paddingTop: 40,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              background: accentColor,
              borderRadius: "50%",
            }}
          />
          <div
            style={{
              fontFamily: monoFontString,
              fontSize: 18,
              color: `${textColor}99`,
              letterSpacing: "0.02em",
            }}
          >
            {urlPath}
          </div>
        </div>
      )}

      {/* Bottom accent element */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 80,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: accentColor,
            borderRadius: 2,
          }}
        />
        <div
          style={{
            width: 20,
            height: 4,
            background: `${accentColor}60`,
            borderRadius: 2,
          }}
        />
        <div
          style={{
            width: 10,
            height: 4,
            background: `${accentColor}30`,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Alternative minimal template
 */
export function generateMinimalOgTemplate(data: OgImageData): JSX.Element {
  const {
    title,
    siteName,
    accentColor = "#0969da",
    backgroundColor = "#ffffff",
    textColor = "#1a1a1a",
  } = data;

  const fonts = [data.fontFamily || "Inter", ...FONT_STACK];

  return (
    <div
      style={{
        width: OG_WIDTH,
        height: OG_HEIGHT,
        display: "flex",
        flexDirection: "column",
        background: backgroundColor,
        fontFamily: fonts.join(", "),
        padding: "80px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 12,
          background: accentColor,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          paddingLeft: 40,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: accentColor,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            marginBottom: 24,
          }}
        >
          {siteName}
        </div>

        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.15,
            color: textColor,
          }}
        >
          {truncate(title, 100)}
        </div>
      </div>
    </div>
  );
}
