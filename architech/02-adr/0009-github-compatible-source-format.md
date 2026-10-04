---
title: "ADR-0009: Source content tương thích GitHub"
description: "Quyết định viết link có đuôi .md trong source và đặt mọi transform URL ở adapter boundary."
---

# ADR-0009: Source content tương thích GitHub

- **Trạng thái:** Accepted
- **Ngày đề xuất:** 2026-10-04
- **Ngày chấp nhận:** 2026-10-04
- **Phạm vi:** Quy ước source content, link transformation, dynamic serve

## Bối cảnh

Source content hiện được viết với clean URL (link không có đuôi `.md`/`.mdx`). Điều này hoạt động tốt trên mdsvr và static hosting, nhưng mọi link nội bộ đều 404 khi đọc trực tiếp trên GitHub, GitLab hoặc preview trong IDE — các công cụ này chỉ resolve đúng đường dẫn file thật trong repository.

Link transformation hiện đã nằm riêng trong static exporter; ADR-0007 chuẩn hóa điều này thành adapter boundary với `mode: "dynamic" | "static"`. Dynamic router cũng đã có pretty-URL resolution: URL không extension được thử hậu tố `.md` rồi `.mdx`.

## Động lực

- Source content là dữ liệu thô; nên tối ưu cho việc đọc trên GitHub và các công cụ Markdown phổ biến.
- Giữ nguyên output clean URL của static export như hiện tại.
- Cho phép dynamic serve mô phỏng chính xác output của export để kiểm tra trước khi triển khai.

## Các phương án

1. Giữ clean URL trong source, chấp nhận link chết trên GitHub.
2. Viết link có `.md` trong source; export transform như hiện tại; serve resolve `.md` URL trực tiếp.
3. Giống phương án 2, cộng thêm serve option để rewrite link sang clean URL giống export.

## Đề xuất

Chọn phương án 3:

- **Source format:** link nội bộ viết có đuôi `.md`/`.mdx` — định dạng duy nhất GitHub, IDE và mdsvr cùng resolve được.
- **Static export:** giữ nguyên transform hiện tại (`.md`/`.mdx` → clean URL), output không đổi.
- **Dynamic serve:** thêm option (ví dụ `cleanUrls`) để adapter HTTP áp dụng cùng hàm link transform của exporter trong HTML output. Khi bật, `.md`/`.mdx` URL redirect `308` về clean URL để có một canonical URL duy nhất.
- Khi option tắt, serve giữ hành vi hiện tại: link `.md` được router resolve trực tiếp.

## Hệ quả dự kiến

### Tích cực

- Source đọc được nguyên bản trên GitHub, GitLab và IDE preview mà không cần tooling riêng.
- Một source format duy nhất; sự khác biệt giữa các mode nằm trọn ở adapter boundary theo ADR-0007.
- Serve với `cleanUrls` bật trở thành preview trung thực của static export.

### Tiêu cực

- Serve mode có thêm một code path transform cần test parity với exporter.
- Hai dạng URL (`.md` và clean) có thể cùng resolve được; cần redirect để tránh SEO duplicate khi `cleanUrls` bật.
- Tài liệu hiện có viết clean URL cần migrate sang link `.md`, kèm kiểm tra anchor và query string.

## Kế hoạch thực thi

1. Tái sử dụng hàm link transform của exporter trong HTTP adapter, điều khiển bằng settings.
2. Thêm redirect `308` từ `.md`/`.mdx` URL về clean URL khi option bật.
3. Viết parity test: cùng source/settings cho output giống nhau giữa serve (`cleanUrls` bật) và export.
4. Migrate source content trong repository sang link `.md`.

## Tiêu chí chấp nhận

ADR chuyển sang Accepted khi link `.md` trong source hoạt động trên GitHub, serve mode và exported output mà không thay đổi contract clean URL của static export.

## Liên quan

- [ADR-0005: Clean URL cho static export](./0005-clean-urls-for-static-export.md)
- [ADR-0007: Hợp nhất pipeline render](./0007-unify-page-rendering-pipeline.md)
- [Luồng HTTP và render](../01-architecture/03-request-rendering-flow.md)
- [Luồng static export](../01-architecture/04-static-export-flow.md)
