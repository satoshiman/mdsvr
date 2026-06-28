---
title: Broken Link Test
---

# Broken Link Test

This file has broken links.

## Invalid: Broken links (should trigger warning)

[Link to missing file](./missing-asset)

[Link to missing file with md](./missing-asset.md)

[Link to missing directory](./non-existent-dir)

[Link to missing file in parent](../non-existent.md)

## Valid: Working links (should NOT trigger warning)

[Link to valid file](./valid.md)

[Link to broken anchor](./broken-anchor.md)

[Link to parent directory](../valid.md)

[Link to external](https://example.com)
