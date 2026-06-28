---
title: README Link Test
description: Test file for README.md link validation
---

# README Link Test

This file tests the README.md link warning.

## Invalid: README.md links (should trigger warning)

[Link to directory README](./../01-getting-started/README.md)

[Link to features README](./../03-features/README.md)

[Link to parent README](../README.md)

## Valid: Directory links (should NOT trigger warning)

[Link to getting started directory](./../01-getting-started)

[Link to features directory](./../03-features)

[Link to parent directory](../)

## Valid: Regular file links (should NOT trigger warning)

[Link to valid file](./valid.md)

[Link to broken anchor file](./broken-anchor.md)
