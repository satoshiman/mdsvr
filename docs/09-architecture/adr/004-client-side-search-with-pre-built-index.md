# ADR-004: Client-side search with pre-built index instead of external service

## Status: Accepted

## Context

Documentation sites need full-text search functionality. Common approaches:
- **External services**: Algolia, Elasticsearch, Meilisearch
- **Server-side search**: Database queries, server-side indexing
- **Client-side search**: Pre-built index searched in browser

External search services require:
- API keys and authentication
- External service dependency
- Network requests for every search
- Service costs at scale
- Privacy concerns (content sent to third party)
- Additional infrastructure setup

## Decision

Implement client-side search using a pre-built `/search-index.json` file. Search happens entirely in the browser.

### Implementation

- `generators/search-index.ts` builds index from all markdown files
- Index includes: title, content, URL, headings
- Index served as `/search-index.json` endpoint
- Client-side JavaScript performs search (fuzzy matching)
- Search triggered by ⌘K / Ctrl+K keyboard shortcut
- Index rebuilt on settings change or during static export

## Consequences

### Positive

- **No external dependency**: Works offline, no service required
- **Fast**: Pre-indexed, no network latency
- **Privacy**: Content never leaves user's browser
- **Free**: No API costs, no service limits
- **Simple**: No infrastructure setup
- **Instant**: No API calls, immediate results
- **Scalable**: Search load distributed to clients

### Negative

- **Index size**: Large docs sites have large index files
- **Initial load**: Index file must be downloaded
- **Limited features**: No advanced search (filters, facets, etc.)
- **Update delay**: Index rebuilds on server restart/settings change
- **Browser memory**: Index loaded into browser memory
- **No analytics**: Cannot track search queries server-side

### Mitigations

- Index compressed and minified
- Incremental rebuild during static export
- Fuzzy matching provides good basic search
- Settings hot-reload triggers index rebuild
- Typical documentation sites have manageable index sizes (< 1MB)
- Can add client-side analytics if needed
