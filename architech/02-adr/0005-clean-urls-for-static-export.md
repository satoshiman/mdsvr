---
title: "ADR-0005: Dùng clean URL cho static export"
description: "Quyết định ánh xạ mỗi trang tài liệu sang thư mục chứa index.html."
---

# ADR-0005: Dùng clean URL cho static export

- **Trạng thái:** Accepted
- **Ngày ghi nhận:** 2026-10-04
- **Loại:** Quyết định hiện trạng, ghi nhận hồi tố

## Bối cảnh

Static output phải hoạt động trên các nhà cung cấp hosting phổ biến và giữ URL gần giống dynamic server. URL chứa `.html`, `.md` hoặc `.mdx` làm lộ implementation và gây khác biệt giữa các mode.

## Động lực

- URL ổn định, dễ đọc.
- Tương thích static hosting dựa trên directory index.
- README đại diện index của directory.
- Link Markdown có thể chuyển sang URL không extension.

## Các phương án

1. Giữ tên `page.html`.
2. Xuất SPA với một `index.html` và client router.
3. Xuất `page/index.html` cho từng trang.

## Quyết định

- `README.md` hoặc `README.mdx` trở thành `index.html` của directory.
- Content file khác trở thành `<tên-trang>/index.html`.
- Directory không có README nhận auto-generated `index.html`.
- Link `.md`/`.mdx` được chuyển sang clean URL trong static output.

## Hệ quả

### Tích cực

- URL không phụ thuộc extension nguồn.
- Hoạt động với static server thông thường mà không cần SPA fallback.
- Cấu trúc route giữa dynamic và static mode gần nhau.

### Tiêu cực

- Số lượng directory output tăng.
- Relative assets và base path cần xử lý cẩn thận.
- Rename source có thể đổi URL nếu không có redirect layer.
- Link conversion bằng chuỗi/regex cần test với anchor và protocol đặc biệt.

## Xác minh

`static-export.test.ts` nên xác minh README mapping, nested page, directory auto-index, asset path và internal link.

## Liên quan

- [Luồng static export](../01-architecture/04-static-export-flow)
- [ADR-0009: Source content tương thích GitHub](./0009-github-compatible-source-format)
