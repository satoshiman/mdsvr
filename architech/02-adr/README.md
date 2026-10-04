---
title: "Architecture Decision Records"
description: "Danh mục các quyết định kiến trúc đã chấp nhận và đang được đề xuất cho mdsvr."
---

# Architecture Decision Records

ADR ghi lại bối cảnh, lựa chọn, hệ quả và trạng thái của quyết định kiến trúc. Các ADR **Accepted** dưới đây được viết hồi tố từ codebase hiện tại; chúng mô tả hành vi đã tồn tại, không khẳng định ngày quyết định ban đầu.

## Danh mục

| ADR                                              | Tiêu đề                                       | Trạng thái |
| ------------------------------------------------ | --------------------------------------------- | ---------- |
| [0001](./0001-filesystem-as-content-source)      | Dùng filesystem làm nguồn nội dung            | Accepted   |
| [0002](./0002-optional-zod-validated-settings)   | Cấu hình tùy chọn được validate bằng Zod      | Accepted   |
| [0003](./0003-server-side-rendering)             | Render Markdown và MDX phía server            | Accepted   |
| [0004](./0004-layered-filesystem-access-control) | Kiểm soát truy cập filesystem nhiều lớp       | Accepted   |
| [0005](./0005-clean-urls-for-static-export)      | Dùng clean URL cho static export              | Accepted   |
| [0006](./0006-isolate-server-instance-state)     | Cô lập settings và cache theo server instance | Proposed   |
| [0007](./0007-unify-page-rendering-pipeline)     | Hợp nhất page-rendering pipeline              | Proposed   |
| [0008](./0008-trusted-content-policy)            | Chính thức hóa policy cho nội dung tin cậy    | Proposed   |
| [0009](./0009-github-compatible-source-format)   | Source content tương thích GitHub             | Accepted   |

## Trạng thái

- **Proposed:** đang thảo luận, chưa phải contract triển khai.
- **Accepted:** đã được chấp nhận và phản ánh trong hệ thống.
- **Deprecated:** không còn nên áp dụng cho thay đổi mới.
- **Superseded:** đã được ADR khác thay thế.
- **Rejected:** đã cân nhắc nhưng không chọn.

## Mẫu ADR

ADR mới nên có:

1. Metadata: trạng thái, ngày, phạm vi.
2. Bối cảnh và vấn đề.
3. Các động lực quyết định.
4. Các phương án đã cân nhắc.
5. Quyết định.
6. Hệ quả tích cực và tiêu cực.
7. Kế hoạch thực thi hoặc tiêu chí xác minh.

Không sửa nội dung quyết định cũ để che giấu thay đổi. Nếu hướng đi đổi đáng kể, tạo ADR mới và đánh dấu ADR cũ là **Superseded**.
