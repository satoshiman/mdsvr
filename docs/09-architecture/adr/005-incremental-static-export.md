# ADR-005: Incremental static export with hash-based caching

## Status: Accepted

## Context

Static HTML export is used for deploying documentation to static hosting (Firebase, Netlify, GitHub Pages). Common approaches:
- **Full rebuild**: Regenerate all files on every export
- **Timestamp-based**: Compare file modification times
- **Hash-based**: Compare content hashes to detect changes

Full rebuild on every export is inefficient:
- Slow for large documentation sites
- Unnecessary regeneration of unchanged content
- Wasted computational resources (especially OG images)
- Longer deployment times

Timestamp-based comparison has issues:
- Doesn't detect content changes if timestamp is modified
- Can miss changes from git operations
- Doesn't handle settings changes properly

## Decision

Implement hash-based incremental export. Only regenerate files when content or settings change.

### Implementation

- Calculate SHA-256 hash for each source file
- Store hash in `_mdsvr/export-state.json`
- Compare current hash with stored hash
- Only regenerate files with changed hashes
- OG images use same hash-based caching
- Settings changes trigger full rebuild (settings hash stored separately)
- Export state includes: file hashes, OG image paths, settings hash

### Hash Calculation

- **Markdown/MDX files**: Hash of file content
- **Auto-index pages**: Hash of directory contents (file names + sizes)
- **Settings**: Hash of `_mdsvr/settings.json`
- **OG images**: Hash of source file (or directory for auto-index)

## Consequences

### Positive

- **Fast exports**: Only changed files regenerated
- **Efficient OG generation**: OG images only regenerated when source changes
- **Reliable**: Hash-based detection is accurate (content-based, not time-based)
- **Settings-aware**: Settings changes trigger full rebuild automatically
- **Orphan cleanup**: Old files removed when source deleted
- **Scalable**: Handles large documentation sites efficiently

### Negative

- **State file dependency**: Export state must be maintained
- **Hash computation overhead**: Must calculate hashes for all files
- **State corruption risk**: Corrupted state can cause issues
- **Complexity**: More complex than full rebuild
- **Initial export**: First export is slower (no state to compare)

### Mitigations

- State file stored in `_mdsvr/` (git-ignored, not served)
- Hash computation is fast (SHA-256, streaming)
- State validation on load, fallback to full rebuild if corrupted
- Clear error messages for state issues
- Initial export is acceptable one-time cost
