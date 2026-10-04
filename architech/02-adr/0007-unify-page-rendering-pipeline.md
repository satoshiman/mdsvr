---
title: "ADR-0007: Hợp nhất page-rendering pipeline"
description: "Đề xuất dùng một application service để render trang cho dynamic server và static export."
---

# ADR-0007: Hợp nhất page-rendering pipeline

- **Trạng thái:** Proposed
- **Ngày đề xuất:** 2026-10-04
- **Phạm vi:** Router, renderer và static exporter

## Bối cảnh

Router và static exporter đều đọc content, chọn Markdown/MDX renderer, suy ra title, build sidebar và gọi `renderPage`. Hai flow có khác biệt cần thiết về asset/link/output, nhưng phần orchestration cốt lõi đang lặp lại.

## Động lực

- Tránh dynamic và static output drift.
- Giảm số nơi phải sửa khi thêm metadata hoặc renderer behavior.
- Cho phép unit test page rendering không cần HTTP hoặc output directory.

## Các phương án

1. Giữ duplication và dựa vào integration tests.
2. Gọi router nội bộ từ exporter.
3. Tách shared page-rendering service, giữ adapter HTTP/export riêng.

## Đề xuất

Chọn phương án 3. Tạo internal service nhận content context và trả rendered page model hoặc HTML:

```typescript
type RenderPageInput = {
  sourcePath: string;
  urlPath: string;
  rootDir: string;
  settings: Settings;
  mode: "dynamic" | "static";
};
```

Service chịu trách nhiệm renderer selection, title/frontmatter/TOC và sidebar. Adapter static thực hiện link/asset transformation có chủ đích; adapter HTTP thực hiện response headers/status.

## Hệ quả dự kiến

### Tích cực

- Một contract thống nhất cho page rendering.
- Test parity giữa hai mode dễ hơn.
- Router tập trung vào HTTP/security; exporter tập trung vào traversal/output.

### Tiêu cực

- Refactor chạm nhiều module và test.
- Nếu abstraction gom quá nhiều option theo mode, nó có thể khó hiểu hơn duplication hiện tại.
- Cần quyết định rõ transformation diễn ra trước hay sau template.

## Kế hoạch thực thi

1. Viết parity test cho cùng source/settings ở hai mode.
2. Trích renderer selection và metadata resolution trước.
3. Trích sidebar/template orchestration.
4. Giữ static-only transformation trong exporter adapter.
5. Loại bỏ helper trùng lặp khi test pass.

## Tiêu chí chấp nhận

ADR chuyển sang Accepted khi router và exporter dùng chung application service mà không thay đổi public output ngoài khác biệt đã tài liệu hóa.

## Liên quan

- [Cấu trúc module](../01-architecture/02-module-map.md)
- [Luồng static export](../01-architecture/04-static-export-flow.md)
- [ADR-0009: Source content tương thích GitHub](./0009-github-compatible-source-format.md)
