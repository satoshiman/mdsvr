---
title: Theming
description: Customize the appearance of your documentation
---

# Theming

mdsvr supports **dark mode**, **light mode**, and **automatic theme detection** based on the user's system preferences.

## Theme Modes

Configure the default theme in `settings.json`:

```json
{
  "appearance": {
    "defaultTheme": "system",
    "allowThemeToggle": true
  }
}
```

### Options

| Mode | Behavior |
|------|----------|
| `system` | Follows the user's OS preference |
| `light` | Always uses light theme |
| `dark` | Always uses dark theme |

## Theme Toggle

When `allowThemeToggle` is enabled, users can switch themes using the button in the header:

<Callout type="tip">
  The user's preference is saved to `localStorage` and persists across sessions.
</Callout>

## Accent Color

Customize the primary color used for links, buttons, and accents:

```json
{
  "appearance": {
    "accentColor": "#0969da"
  }
}
```

This affects:
- Links in content
- Sidebar active state
- Button hover states
- Search highlight
- Badges with accent color

### Recommended Colors

| Color | Hex Value |
|-------|-----------|
| GitHub Blue | `#0969da` |
| Purple | `#8250df` |
| Green | `#1a7f37` |
| Red | `#cf222e` |
| Orange | `#9a6700` |

## Code Themes

Configure syntax highlighting themes for light and dark modes:

```json
{
  "appearance": {
    "codeTheme": {
      "light": "github-light",
      "dark": "github-dark"
    }
  }
}
```

Currently supported:
- `github-light`
- `github-dark`

## CSS Variables

The following CSS variables are available for custom styling:

```css
:root[data-theme="light"] {
  --bg: #ffffff;
  --bg-secondary: #f6f8fa;
  --border: #d1d9e0;
  --text: #1f2328;
  --text-muted: #636c76;
  --accent: var(--accent-color, #0969da);
  --code-bg: #f6f8fa;
}

:root[data-theme="dark"] {
  --bg: #0d1117;
  --bg-secondary: #161b22;
  --border: #30363d;
  --text: #e6edf3;
  --text-muted: #8d96a0;
  --accent: var(--accent-color, #58a6ff);
  --code-bg: #161b22;
}
```

You can use these variables in custom CSS if needed (custom CSS injection coming in a future release).

## System Preference Detection

When using `defaultTheme: "system"`, mdsvr automatically detects the user's OS preference:

```javascript
// Runs before paint to prevent flash
const theme = localStorage.getItem("theme") ||
  (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
document.documentElement.setAttribute("data-theme", theme);
```

The theme also updates automatically when the system preference changes (no page reload needed).

## No-Flash Theme Loading

To prevent a flash of unstyled content (FOUC) when the page loads, mdsvr injects a small script in the `<head>` that:

1. Checks `localStorage` for a saved preference
2. Falls back to system preference if no saved preference
3. Sets the `data-theme` attribute before the page renders

This ensures the correct theme is applied immediately without any visible flash.

## Example Configuration

```json
{
  "appearance": {
    "defaultTheme": "system",
    "allowThemeToggle": true,
    "accentColor": "#8250df",
    "codeTheme": {
      "light": "github-light",
      "dark": "github-dark"
    }
  }
}
```
