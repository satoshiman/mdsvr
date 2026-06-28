---
title: Test Vietnamese Slugify
description: Test file for slugify utility with Vietnamese text, should NOT trigger any warning
---

# Test Vietnamese Slugify

This file tests the slugify utility function with Vietnamese text.

## Basic Vietnamese Characters

Á à ả ã ạ â ấ ầ ẩ ẫ ậ
É è ẻ ẽ ẹ ê ế ề ể ễ ệ
Í ì ỉ ĩ ị
Ó ò ỏ õ ọ ô ố ồ ổ ỗ ộ ơ ớ ờ ở ỡ ợ
Ú ù ủ ũ ụ ư ứ ừ ử ữ ự
Ý ỳ ỷ ỹ ỵ
Đ đ

## Special Cases

### Chữ Đ và đ

Testing đ/Đ conversion to d/D.

### Ký tự đặc biệt

Testing special characters removal.

## Test Headings for Anchor Generation

These headings will be slugified to create anchors:

### Tiếng Việt với dấu

Content for testing Vietnamese slugify.

### Chữ cái đặc biệt

Content for testing special characters.

### Chữ Đ và đ

Content for testing Đ/Đ conversion.

### Ký # tự & đặc biệt @#$%

Content for testing special character removal.

## Valid Anchor Links (should NOT trigger warning)

These use correct slugs after slugify:

[Link to Tiếng Việt](#tieng-viet-voi-dau)

[Link to Chữ cái đặc biệt](#chu-cai-dac-biet)

[Link to Chữ Đ và đ](#chu-d-va-d)

[Link to Ký tự đặc biệt](#ky-tu-dac-biet)
