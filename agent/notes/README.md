# Agent Notes

Thư mục này chứa các ghi chú vận hành dành cho agent làm việc trên repo `mdsvr`. Các tài liệu này bổ sung cho `../AGENTS.md` và `../agent/README.md`, tập trung vào những việc agent cần làm thường xuyên.

## Các ghi chú

| File                                           | Mục đích                                                |
| ---------------------------------------------- | ------------------------------------------------------- |
| [testing.md](./testing.md)                     | Chọn test nào, chạy test như thế nào, quy ước viết test |
| [release.md](./release.md)                     | Quy trình release npm, GitHub Pages, Docker             |
| [docs-verification.md](./docs-verification.md) | Kiểm tra docs Markdown/MDX trước khi hoàn thành         |

> Xem phân biệt các folder `docs/`, `default-docs/`, `docs-for-test/` trong `../AGENTS.md` mục **Documentation Folders**.

## Khi nào dùng notes này

- Trước khi commit một bug fix hoặc feature: xem [testing.md](./testing.md).
- Khi user yêu cầu release hoặc chuẩn bị PR release: xem [release.md](./release.md).
- Khi sửa hoặc thêm tài liệu `docs/`: xem [docs-verification.md](./docs-verification.md).

## Quy ước chung

- Giữ các ghi chú ngắn gọn, hành động được ngay.
- Cập nhật nếu workflow, script, hoặc cấu trúc project thay đổi.
- Không đưa thông tin bí mật, credentials, hoặc config máy local vào đây.
