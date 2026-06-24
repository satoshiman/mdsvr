# ADR-002: Server-side MDX rendering instead of client-side

## Status: Accepted

## Context

MDX (Markdown + JSX) enables interactive components in documentation. Common rendering approaches:
- **Client-side rendering**: Browser processes MDX with React/Next.js
- **Server-side rendering**: Server processes MDX to HTML before sending to client

Client-side MDX requires:
- JavaScript framework in the browser (React, Vue, etc.)
- Bundle size increase (MDX runtime, React, components)
- Initial page load delay (hydration)
- Client-side processing power
- Potential SEO issues (content not in initial HTML)

## Decision

Process MDX server-side using `@mdx-js/mdx` and React. Send fully rendered HTML to the client.

### Implementation

- MDX files processed by `renderer/mdx.ts` using `@mdx-js/mdx`
- React components rendered server-side to HTML
- Built-in components (Callout, Steps, Tabs, etc.) defined in renderer
- Resulting HTML embedded in page template
- No client-side framework required for basic functionality

## Consequences

### Positive

- **No client-side framework**: Pages work without JavaScript
- **Faster initial load**: No hydration delay, content in HTML
- **Better SEO**: Search engines see full content immediately
- **Smaller bundles**: No React/MDX runtime sent to client
- **Simpler deployment**: No build step for client-side code
- **Works offline**: Once loaded, no additional processing needed
- **Better performance**: Server handles rendering, client just displays

### Negative

- **Server load**: Rendering happens on server, not distributed to clients
- **No interactivity**: Components are static HTML after rendering
- **Hot reload complexity**: MDX changes require server re-processing
- **Limited dynamic behavior**: Cannot use React hooks or state
- **Component limitations**: Only server-safe components allowed

### Mitigations

- Server is lightweight (Node.js), rendering is fast
- Interactive features (search, theme toggle) use vanilla JS
- Settings hot-reload handles configuration changes
- Static export pre-renders all content for CDN deployment
- Components designed for static output (no state/hooks)
