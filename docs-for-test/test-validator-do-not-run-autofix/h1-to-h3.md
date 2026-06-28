---
title: H1 to H3 Test
description: This file has H1 that should be H3 (skipping H2)
---

# H1 to H3 Test

This file has heading hierarchy issues - H1 followed by H3, skipping H2.

### This is H3 (skipped H2)

This H3 should trigger a heading hierarchy error because it skips H2.

## This is H2 (valid)

This is a valid H2.

### This is H3 (valid)

This is a valid H3 under H2.

##### This is H5 (skipped H4)

This H5 should trigger an error because it skips H4.
