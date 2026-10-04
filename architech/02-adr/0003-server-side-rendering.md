---
title: "ADR-0003: Render Markdown và MDX phía server"
description: "Quyết định tạo HTML trên Node.js và chỉ gửi static markup đến client."
---

# ADR-0003: Render Markdown và MDX phía server

- **Trạng thái:** Accepted
- **Ngày ghi nhận:** 2026-10-04
- **Loại:** Quyết định hiện trạng, ghi nhận hồi tố

## Bối cảnh

Website tài liệu cần nội dung HTML sẵn sàng cho SEO, hoạt động ở dynamic server và static hosting, đồng thời hỗ trợ Markdown lẫn MDX component.

## Động lực

- Nội dung đọc được ngay không cần boot client framework.
- Cùng renderer có thể phục vụ HTTP và ghi file tĩnh.
- SEO crawler nhận nội dung hoàn chỉnh.
- Giữ frontend runtime nhỏ.

## Các phương án

1. Render Markdown/MDX trên client.
2. Prebuild toàn bộ trước khi serve.
3. Render phía server theo request và tái sử dụng khi static export.

## Quyết định

Markdown được render bằng `markdown-it`; MDX được compile/run bằng `@mdx-js/mdx`, React JSX runtime và `renderToStaticMarkup`. Template ghép HTML fragment với layout, sidebar, TOC và metadata. Dynamic mode render theo request; export mode ghi kết quả ra file.

## Hệ quả

### Tích cực

- SEO và first content không phụ thuộc JavaScript hydration.
- Hỗ trợ server mode không có build step nội dung.
- Static export tái sử dụng phần lớn rendering stack.
- Built-in MDX components có thể cấu hình bật/tắt.

### Tiêu cực

- Render MDX tốn CPU hơn plain static file.
- MDX execution đòi hỏi nội dung tin cậy.
- Tương tác client phong phú phải dùng JavaScript riêng trong template/assets.
- Hai renderer Markdown/MDX có thể khác nhau ở plugin và callout behavior.

## Xác minh

Renderer phải trả `{ html, frontmatter, toc }`; router và exporter đều đưa kết quả vào `renderPage`.

## Liên quan

- [Luồng HTTP và render](../01-architecture/03-request-rendering-flow.md)
- [ADR-0008](./0008-trusted-content-policy.md)
