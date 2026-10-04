# mdsvr Agent Workspace

Thư mục này lưu đặc tả, kế hoạch triển khai và event history dành riêng cho repo `md-serve`.

## Cấu trúc

- `workspace.json`: repo map cho event logging; fallback repo là `md-serve`.
- `event.py`: symlink tới shared event tool tại `/Users/apple/agent-workspaces/scripts/event.py`.
- `events/`: event log được tạo bởi `event.py`; không tạo event thử nghiệm.
- `implementation-guide/`: đặc tả, hướng dẫn feature/fix và kế hoạch triển khai lịch sử.
  - `0.micro-bug.md`: hướng dẫn xử lý bug nhỏ.
  - `1.AGENT.md`: đặc tả nền tảng V1.
  - `2.AGENT-v2.md`: đặc tả nâng cấp V2.
  - `3.AGENT-mermiad.md` đến `16.markdown-validation.md`: đặc tả theo feature, fix hoặc kế hoạch triển khai.

## Quy ước tài liệu

- Giữ các tài liệu đã triển khai làm lịch sử; không xem chúng là mô tả chính xác tuyệt đối của code hiện tại.
- Với yêu cầu mới, tạo file trong `implementation-guide/` với số thứ tự tiếp theo và tên kebab-case mô tả phạm vi, ví dụ `implementation-guide/17.feature-name.md`.
- Mỗi đặc tả mới nên nêu mục tiêu, phạm vi, file liên quan, acceptance criteria và cách verification.
- Kiểm tra source code, `package.json`, test và tài liệu hiện hành trước khi dùng một đặc tả cũ làm căn cứ.
- Quy tắc làm việc chung và event logging nằm ở `../AGENTS.md`.

## Event logging

Chạy từ thư mục này:

```bash
python3 event.py --help
python3 event.py search --limit 1 --compact
```

Không sửa shared script qua symlink. Nếu tooling chung cần thay đổi, thực hiện trong repo `/Users/apple/agent-workspaces`.
