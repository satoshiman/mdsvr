---
title: "ADR-0008: Chính thức hóa policy cho nội dung tin cậy"
description: "Đề xuất xác định rõ Markdown HTML và MDX chỉ chạy với nguồn nội dung tin cậy."
---

# ADR-0008: Chính thức hóa policy cho nội dung tin cậy

- **Trạng thái:** Proposed
- **Ngày đề xuất:** 2026-10-04
- **Phạm vi:** Security và deployment

## Bối cảnh

Markdown renderer bật HTML thô. MDX được compile và chạy trong Node.js process. Đây là lựa chọn mạnh cho docs do maintainer kiểm soát, nhưng không cung cấp isolation cho nội dung do người dùng không tin cậy gửi lên.

## Động lực

- Tránh người tích hợp hiểu nhầm mdsvr là sandbox.
- Làm rõ threat model cho CLI, Docker và programmatic API.
- Hướng test và hardening vào đúng ranh giới.

## Các phương án

1. Ngầm giả định nội dung luôn đáng tin cậy.
2. Chính thức hóa trusted-content policy và fail/document rõ use case không hỗ trợ.
3. Xây sandbox/sanitizer đầy đủ cho untrusted content ngay lập tức.

## Đề xuất

Chọn phương án 2 cho phiên bản hiện tại:

- Chỉ chạy mdsvr với docs root do operator tin cậy.
- Không nhận upload Markdown/MDX trực tiếp từ người dùng cuối.
- Programmatic API phải tài liệu hóa MDX có thể thực thi code lúc render.
- Docker mount docs nên là read-only khi môi trường cho phép.
- Security docs phải phân biệt file-access protection với content sandboxing.

Sandbox/untrusted mode chỉ được thêm bằng ADR riêng sau khi xác định rõ mức tương thích MDX và mô hình isolation.

## Hệ quả dự kiến

### Tích cực

- Threat model rõ và trung thực với implementation.
- Không tạo cảm giác an toàn giả bằng sanitizer không bao phủ MDX execution.
- Maintainer biết nơi cần kiểm soát nguồn content.

### Tiêu cực

- Không phù hợp nền tảng multi-tenant hoặc user-generated docs trực tiếp.
- Người tích hợp phải thêm moderation/isolation bên ngoài.
- Cần đồng bộ wording giữa README, docs và API documentation.

## Kế hoạch thực thi

1. Thêm cảnh báo trusted content vào user docs và programmatic API docs.
2. Thêm ví dụ Docker read-only mount.
3. Rà soát security tests để không tuyên bố vượt quá file-access guarantees.
4. Cân nhắc CSP/security headers như defense-in-depth riêng.

## Tiêu chí chấp nhận

ADR chuyển sang Accepted khi policy xuất hiện nhất quán trong tài liệu public và release notes phù hợp.

## Liên quan

- [Mô hình bảo mật](../01-architecture/06-security-model)
- [ADR-0003](./0003-server-side-rendering)
