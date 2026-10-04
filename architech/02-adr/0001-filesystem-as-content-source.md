---
title: "ADR-0001: Dùng filesystem làm nguồn nội dung"
description: "Quyết định lưu nội dung mdsvr trong cây file Markdown/MDX thay vì database hoặc CMS."
---

# ADR-0001: Dùng filesystem làm nguồn nội dung

- **Trạng thái:** Accepted
- **Ngày ghi nhận:** 2026-10-04
- **Loại:** Quyết định hiện trạng, ghi nhận hồi tố

## Bối cảnh

mdsvr cần biến tài liệu sẵn có thành website với thời gian thiết lập thấp. Đối tượng chính đã quản lý Markdown trong repository và mong muốn chạy một lệnh mà không vận hành database hay CMS.

## Động lực

- Zero-configuration và khởi động nhanh.
- Nội dung thân thiện với Git, code review và branch workflow.
- Có thể copy, mount hoặc export dễ dàng.
- Giảm dependency vận hành.

## Các phương án

1. **Filesystem Markdown/MDX:** đơn giản, portable, phù hợp repository.
2. **Database nội bộ:** hỗ trợ query/update nhưng cần migration và persistence lifecycle.
3. **Headless CMS:** có UI quản trị nhưng thêm network dependency, auth và mapping model.

## Quyết định

Dùng cây filesystem do người dùng chỉ định làm nguồn sự thật. Nội dung chính là `.md` và `.mdx`; assets và cấu hình tùy chọn nằm cạnh cây docs. Server động chỉ đọc filesystem qua HTTP path đã kiểm tra.

## Hệ quả

### Tích cực

- Không cần database hoặc service bên ngoài.
- Nội dung có thể version control và review cùng code.
- Dynamic serve và static export dùng cùng nguồn.
- Backup và di chuyển chỉ là thao tác file.

### Tiêu cực

- Không có transaction hoặc concurrent editing model.
- Search cần build index từ file.
- Metadata phức tạp phụ thuộc frontmatter và quy ước file.
- Hiệu năng với cây rất lớn phụ thuộc filesystem scan và cache bổ sung.

## Xác minh

Quyết định thể hiện ở `createServer(rootDir)`, router dựa trên path, renderer đọc file và exporter duyệt directory tree.

## Liên quan

- [Tổng quan hệ thống](../01-architecture/01-system-overview.md)
- [ADR-0004](./0004-layered-filesystem-access-control.md)
