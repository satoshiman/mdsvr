---
title: H2 to H4 Test
description: This file has H2 that should be H4 (skipping H3)
---

# H2 to H4 Test

This file has heading hierarchy issues - H2 followed by H4, skipping H3.

## This is H2

This is a valid H2 heading.

#### This is H4 (skipped H3)

This H4 should trigger a heading hierarchy error because it skips H3.

## Another H2

Content.

### This is H3 (valid)

This is a valid H3.

#### This is H4 (valid)

This is a valid H4.

###### This is H6 (skipped H5)

This H6 should trigger an error because it skips H5.
