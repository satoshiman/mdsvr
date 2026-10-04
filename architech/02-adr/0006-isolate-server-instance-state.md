---
title: "ADR-0006: Cô lập settings và cache theo server instance"
description: "Đề xuất loại bỏ state cấp module để nhiều server instance không ảnh hưởng lẫn nhau."
---

# ADR-0006: Cô lập settings và cache theo server instance

- **Trạng thái:** Proposed
- **Ngày đề xuất:** 2026-10-04
- **Phạm vi:** HTTP runtime

## Bối cảnh

`currentSettings` và `searchIndexCache` đang là biến cấp module trong `server.ts`. Mỗi lần `createServer` chạy, các biến này được ghi lại. Nếu một process tạo nhiều server cho các root khác nhau, request hoặc reload settings của instance này có thể nhìn thấy state của instance khác.

## Động lực

- Public API không cấm tạo nhiều server instance.
- Test và embedding scenario cần isolation rõ ràng.
- Lifecycle cache phải gắn với server sở hữu nó.

## Các phương án

1. Giữ state cấp module và tài liệu hóa chỉ hỗ trợ một instance.
2. Dùng map toàn cục theo server/root.
3. Đóng settings/cache trong closure của từng `createServer`.

## Đề xuất

Chọn phương án 3. Mỗi invocation sở hữu một mutable context:

```typescript
type ServerContext = {
  settings: Settings;
  searchIndexCache: unknown;
};
```

HTTP callback đọc context của chính instance. `reloadSettings` và watcher chỉ cập nhật context này. Loại bỏ export của state toàn cục nếu không phải public contract.

## Hệ quả dự kiến

### Tích cực

- Nhiều server instance độc lập trong cùng process.
- Dễ test cache/reload mà không reset module state.
- Ownership và lifecycle rõ ràng hơn.

### Tiêu cực

- Cần kiểm tra code/test đang import internal state.
- Watcher cleanup cần gắn với `close()` để tránh resource leak.
- Có thể phải mở rộng `ServerInstance` nội bộ nhưng không nên lộ cache.

## Kế hoạch thực thi

1. Viết integration test chạy hai root trên hai port.
2. Thay global variables bằng per-instance context.
3. Đảm bảo reload một instance không đổi title/search của instance kia.
4. Đóng settings watcher cùng server lifecycle.
5. Chạy toàn bộ test.

## Tiêu chí chấp nhận

ADR chuyển sang Accepted khi multi-instance test pass và không còn mutable server state cấp module.

## Liên quan

- [Cấu hình và dữ liệu](../01-architecture/05-configuration-and-data.md)
