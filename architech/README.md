---
title: "Kiến trúc mdsvr"
description: "Điểm bắt đầu cho tài liệu kiến trúc và Architecture Decision Records của mdsvr."
---

# Kiến trúc mdsvr

Bộ tài liệu này mô tả kiến trúc **đang được triển khai trong codebase**, các ràng buộc kỹ thuật và những quyết định kiến trúc quan trọng của mdsvr. Đối tượng đọc chính là maintainer, contributor và kỹ sư vận hành dự án.

> Lưu ý: Tên thư mục `architech` được giữ đúng theo yêu cầu. Nội dung bên trong sử dụng thuật ngữ chuẩn “architecture” và “ADR”.

## Điều hướng nhanh

### Tài liệu kiến trúc

1. [Tổng quan hệ thống](./01-architecture/01-system-overview.md)
2. [Cấu trúc module](./01-architecture/02-module-map.md)
3. [Luồng HTTP và render](./01-architecture/03-request-rendering-flow.md)
4. [Luồng static export](./01-architecture/04-static-export-flow.md)
5. [Cấu hình và dữ liệu](./01-architecture/05-configuration-and-data.md)
6. [Mô hình bảo mật](./01-architecture/06-security-model.md)
7. [Vận hành, kiểm thử và giới hạn](./01-architecture/07-operations-and-quality.md)

### Quyết định kiến trúc

- [Danh mục ADR](./02-adr/README.md)
- ADR có trạng thái **Accepted** ghi nhận hiện trạng đã có trong code.
- ADR có trạng thái **Proposed** là hướng cải tiến, chưa được xem là cam kết triển khai.

## Phạm vi

Tài liệu bao phủ:

- CLI và public API;
- HTTP server, router và kiểm soát truy cập file;
- pipeline Markdown, MDX và HTML template;
- cấu hình `_mdsvr/settings.json`;
- search index, sitemap, RSS và Open Graph image;
- static export và export state;
- chiến lược kiểm thử, build và phát hành.

Tài liệu không thay thế [hướng dẫn người dùng](../docs/README.md) và không mô tả chi tiết từng option cấu hình.

## Nguồn sự thật

Khi tài liệu khác với hành vi chạy thực tế, thứ tự ưu tiên là:

1. test tự động;
2. mã nguồn trong `src/`;
3. tài liệu kiến trúc này;
4. tài liệu hướng dẫn sử dụng.

## Quy ước cập nhật

Mọi thay đổi làm biến đổi ranh giới module, luồng dữ liệu, mô hình bảo mật hoặc public API nên đi kèm:

1. cập nhật trang kiến trúc liên quan;
2. ADR mới hoặc ADR thay thế quyết định cũ;
3. test chứng minh hành vi mới.
