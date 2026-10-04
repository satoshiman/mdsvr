---
title: "ADR-0002: Cấu hình tùy chọn được validate bằng Zod"
description: "Quyết định dùng defaults và Zod schema cho cấu hình _mdsvr/settings.json."
---

# ADR-0002: Cấu hình tùy chọn được validate bằng Zod

- **Trạng thái:** Accepted
- **Ngày ghi nhận:** 2026-10-04
- **Loại:** Quyết định hiện trạng, ghi nhận hồi tố

## Bối cảnh

mdsvr phải chạy khi không có file cấu hình nhưng vẫn cần tùy biến site, navigation, search, SEO, file policy và MDX. Cấu hình JSON do người dùng sửa có thể thiếu field hoặc sai kiểu.

## Động lực

- Giữ trải nghiệm zero-config.
- Có runtime validation và TypeScript type thống nhất.
- Thêm field mới với default tương thích ngược.
- Cho phép CLI báo lỗi rõ khi người dùng chủ động validate.

## Các phương án

1. Parse JSON và truy cập trực tiếp.
2. JSON Schema thuần với type viết riêng.
3. Zod schema tạo runtime validation và inferred types.

## Quyết định

Dùng `SettingsSchema` bằng Zod làm model settings. `_mdsvr/settings.json` là tùy chọn. Runtime load fallback về toàn bộ defaults khi file thiếu hoặc không hợp lệ; lệnh validate trả lỗi cụ thể. Server có thể theo dõi file và reload mà không restart.

## Hệ quả

### Tích cực

- Settings luôn có shape đầy đủ sau parse.
- Type và runtime contract cùng xuất phát từ schema.
- Cấu hình tối thiểu vẫn hoạt động.
- Hot reload giảm vòng lặp phát triển.

### Tiêu cực

- Runtime load fallback có thể che lỗi cấu hình nếu người dùng bỏ qua warning.
- Schema, default settings generator và docs có thể drift nếu không test cùng nhau.
- `fs.watch` có semantics khác nhau giữa nền tảng và có thể phát nhiều event.

## Quy tắc phát triển

- Field mới phải có default trừ khi thực sự bắt buộc.
- Breaking change cần ADR hoặc migration rõ ràng.
- Cập nhật schema, generator, docs và test trong cùng thay đổi.

## Liên quan

- [Cấu hình và dữ liệu](../01-architecture/05-configuration-and-data)
