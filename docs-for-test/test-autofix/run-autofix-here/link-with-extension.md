---
title: Link with Extension Test
description: This file has links with .md extension that should be removed
---

# Link with Extension Test

This file has links with .md extension that should be removed by autofix.

## Test Case 1

Link to [page1](page1) - this should be fixed to [page1](page1).

## Test Case 2

Link to [another-page.md#section](another-page.md#section) - this should be fixed to [another-page#section](another-page#section).

## Test Case 3

Link to [docs/guide.md](docs/guide.md) - this should be fixed to [docs/guide](docs/guide).
