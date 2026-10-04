---
title: "ADR-0004: Kiểm soát truy cập filesystem nhiều lớp"
description: "Quyết định dùng lexical containment, realpath containment và file policy trong router."
---

# ADR-0004: Kiểm soát truy cập filesystem nhiều lớp

- **Trạng thái:** Accepted
- **Ngày ghi nhận:** 2026-10-04
- **Loại:** Quyết định hiện trạng, ghi nhận hồi tố

## Bối cảnh

HTTP path do client kiểm soát được ánh xạ trực tiếp vào filesystem. Chỉ kiểm tra extension hoặc chuỗi path không đủ để chặn traversal và symlink escape.

## Động lực

- Không để lộ file ngoài docs root.
- Chặn secret và file nội bộ ngay cả khi nằm trong root.
- Giữ server read-only.
- Cho phép maintainer cấu hình allow/block policy có kiểm soát.

## Các phương án

1. Kiểm tra string prefix trên absolute path.
2. Chỉ dùng `path.resolve` và lexical containment.
3. Kết hợp lexical containment, canonical `realpath` containment và file policy.

## Quyết định

Router áp dụng nhiều lớp:

1. resolve candidate và kiểm tra bằng `path.relative`;
2. từ chối hidden filename;
3. từ chối blocked extension;
4. resolve root/target bằng `realpath` và kiểm tra containment lần nữa;
5. chỉ render content type hỗ trợ hoặc stream extension nằm trong allowlist;
6. chỉ chấp nhận `GET` và `HEAD`.

## Hệ quả

### Tích cực

- Chặn traversal dạng `..` và symlink thoát root.
- File policy tách biệt với routing happy path.
- Bề mặt HTTP không có mutation endpoint.

### Tiêu cực

- `realpath` yêu cầu target tồn tại, nên pretty URL cần nhánh fallback riêng.
- Policy hidden/block/allow phải giữ nhất quán giữa server và exporter.
- Cấu hình sai allowlist vẫn có thể công khai file không mong muốn trong root.

## Tiêu chí hồi quy

Test phải bao phủ traversal, encoded paths, sibling-prefix path, symlink escape, hidden files, blocked extensions và method không hỗ trợ.

## Liên quan

- [Mô hình bảo mật](../01-architecture/06-security-model.md)
