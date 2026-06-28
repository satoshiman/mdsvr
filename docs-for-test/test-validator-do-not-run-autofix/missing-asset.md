---
title: Missing Asset Test
---

# Missing Asset Test

This file references missing assets.

## Invalid: Missing assets (should trigger warning)

![Missing Image](./assets/missing-image.png)

![Missing JPG](./missing-photo.jpg)

![Missing SVG](./icons/missing-icon.svg)

## Valid: External assets (should NOT trigger warning)

![External Image](https://example.com/image.png)

![External JPG](https://example.com/photo.jpg)

## Valid: Existing assets (should NOT trigger warning)

![Existing image](../../image.png)
