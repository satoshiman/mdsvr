---
title: "Vận hành, kiểm thử và giới hạn"
description: "Mô tả build, test, deployment, observability và các giới hạn kiến trúc hiện tại."
---

# Vận hành, kiểm thử và giới hạn

mdsvr được đóng gói thành npm package ESM, CLI executable và Docker image. Runtime yêu cầu Node.js theo `package.json` và build bằng TypeScript compiler.

## Build và kiểm thử

| Mục đích | Lệnh |
| --- | --- |
| Build package | `npm run build` |
| Build test artifacts | `npm run build:test` |
| Chạy toàn bộ test | `npm test` |
| Chạy local CLI | `npm run start -- ./docs` |
| Sinh website docs | `npm run docs:generate` |

`npm test` build source, build test source rồi chạy Node test runner trên `dist-test/test/*.test.js`.

## Phân lớp test hiện có

- `directory.test.ts`: directory rendering.
- `renderer.test.ts`: Markdown/MDX rendering behavior.
- `router.test.ts`: routing và file access policy.
- `server.test.ts`: server lifecycle và HTTP integration.
- `static-export.test.ts`: output layout và export behavior.
- `template.test.ts`: HTML template.
- `validator.test.ts`: Markdown validation/autofix.
- `og.test.ts`: Open Graph generation/state.

## Deployment model

### npm/CLI

`bin/mdsvr.js` gọi build output. Package export công khai nằm ở `dist/index.js` và type declaration tương ứng.

### Docker

Container mount docs directory và mở port server. Root docs vẫn là volume/file tree, không cần database hay service phụ.

### Static hosting

Exporter tạo cây HTML có thể triển khai bằng GitHub Pages, Firebase, Netlify hoặc static server tương đương.

## Observability hiện tại

- Logging bằng `console.log`, `console.warn` và `console.error`.
- Có `silent` cho một số flow.
- Không có structured logging, metrics hay tracing.
- Lỗi request không dự kiến trả `500` và log server-side.

## Đặc tính hiệu năng

- Nội dung page được đọc và render theo request, không có page cache.
- Search index được giữ trong memory.
- Static assets dùng stream ở dynamic server.
- Static export xử lý cây nội dung tuần tự ở nhiều bước.
- OG image dùng hash để tránh tạo lại không cần thiết.

## Giới hạn đã biết

1. Settings và search cache là state cấp module, không cô lập tốt khi có nhiều server instance.
2. Router và exporter lặp lại một phần page-render orchestration.
3. MDX không phải sandbox và chỉ phù hợp nguồn tin cậy.
4. HTML export hiện được render lại toàn bộ; tính incremental tập trung ở OG image.
5. API observability tối giản, phù hợp CLI nhỏ nhưng hạn chế khi nhúng vào hệ thống lớn.
6. README gốc ghi Node.js 18+, trong khi `package.json` yêu cầu Node.js 22+; package metadata nên được xem là contract thực thi hiện tại.

## Quy trình thay đổi kiến trúc

1. Viết hoặc cập nhật ADR.
2. Bổ sung test cho contract bị ảnh hưởng.
3. Triển khai thay đổi nhỏ theo boundary module.
4. Chạy build và toàn bộ test.
5. Cập nhật tài liệu kiến trúc và hướng dẫn người dùng.

## Liên quan

- [Danh mục ADR](../02-adr/README.md)
- [ADR-0006: Cô lập server state](../02-adr/0006-isolate-server-instance-state.md)
- [ADR-0007: Hợp nhất pipeline render](../02-adr/0007-unify-page-rendering-pipeline.md)
