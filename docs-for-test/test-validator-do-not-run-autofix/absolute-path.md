---
title: Absolute Path Test
description: Test file for absolute path validation
---

# Absolute Path Test

This file tests the absolute path warning.

## Invalid: Absolute paths (should trigger warning)

[Link to features](/03-features/README.md)

[Link to features](/03-features)

[Link to getting started](/01-getting-started)

[Link to root](/)

## Valid: Relative paths (should NOT trigger warning)

[Link to valid file](./valid.md)

[Link to parent directory](../valid.md)

[Link to sibling](../test-autofix/test-autofix-h2-to-h4.md)

## Valid: External links (should NOT trigger warning)

[External link](https://example.com)

[External link with path](https://example.com/docs)
