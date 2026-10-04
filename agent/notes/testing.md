# Hướng dẫn test cho agent

Tài liệu này giúp agent xác định **nên test gì** và **chạy test như thế nào** khi làm việc trên repo `mdsvr`.

## Nguyên tắc chung

- **Luôn chạy test tập trung trước**, sau đó mới chạy `npm test` để đảm bảo không phá vỡ gói đầy đủ.
- Không chỉ sửa code mà quên test. Với bug fix, viết test tái hiện bug trước khi sửa.
- `npm test` chạy toàn bộ test suite: build source, build test, rồi chạy `node --test` trên `dist-test/test/*.test.js`.

## Các lệnh test chính

```bash
# Test tất cả (build + test)
npm test

# Build source TypeScript
npm run build

# Build test TypeScript
npm run build:test

# Chạy một file test cụ thể sau khi build
node --test dist-test/test/router.test.js

# Watch mode khi phát triển
npm run dev
```

> Yêu cầu Node.js >=22 và `npm ci` đã được chạy.

## Chọn test phù hợp với thay đổi

| Khu vực thay đổi                                            | File test nên tập trung                              | Kiểm tra gì                                                |
| ----------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| Routing, redirect, directory index, path traversal, symlink | `test/router.test.ts`                                | status code, `location`, body HTML, an toàn path traversal |
| Render Markdown/MDX, code blocks, math, mermaid, TOC        | `test/renderer.test.ts`                              | output HTML, class names, TOC hierarchy                    |
| Xuất static HTML, OG image, cleanup orphaned files          | `test/static-export.test.ts`                         | file output, meta tags, trạng thái export                  |
| Validation links/headings                                   | `test/validator.test.ts`                             | `valid`, `errors`, `fixed`                                 |
| Server lifecycle, multi-instance                            | `test/server.test.ts`, `test/multi-instance.test.ts` | khởi động, đóng, cổng, nhiều instance                      |
| OG image generation                                         | `test/og.test.ts`                                    | hình ảnh OG được tạo                                       |
| GitHub source formatting                                    | `test/github-source-format.test.ts`                  | định dạng source phù hợp GitHub                            |
| Navigation, sidebar, directory listing                      | `test/directory.test.ts`, `test/router.test.ts`      | thứ tự sidebar, danh sách thư mục                          |

## Quy ước viết test

- Sử dụng `node:test` và `node:assert` (đã có sẵn trong Node.js).
- Import source bằng đường dẫn relative tới `src/*.js` (ESM), ví dụ `import { createServer } from "../src/server.js"`.
- Dùng `before`/`after` để dọn dẹp tài nguyên tạm (temp dir, server instance).
- Với HTTP request đặc biệt (path traversal, encoded slashes), dùng `node:http` thay vì `fetch` để tránh normalize URL.
- Ưu tiên assert cụ thể (`assert.strictEqual`) thay vì `assert.ok` khi có thể.

## Checklist khi thêm/sửa tính năng

1. [ ] Xác định file test liên quan từ bảng trên.
2. [ ] Thêm test case mô tả hành vi mới hoặc bug fix.
3. [ ] Chạy file test đó qua `dist-test` trước.
4. [ ] Chạy `npm test` để đảm bảo không regression.
5. [ ] Nếu test thất bại do build, kiểm tra `tsconfig.test.json` và import ESM.

## Xử lý lỗi test thường gặp

| Triệu chứng                       | Nguyên nhân có thể                               | Cách xử lý                                                               |
| --------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| `Cannot find module '../src/...'` | Quên build hoặc import sai đuôi `.js`            | Chạy `npm run build` hoặc `npm run build:test`; import ESM phải có `.js` |
| Test server treo                  | `server.close()` hoặc `fs.rm` temp chưa được gọi | Kiểm tra `after` hook                                                    |
| OG test chậm                      | sharp/resvg render ảnh                           | Bình thường, kiên nhẫn chờ                                               |
| Lỗi cổng đã được sử dụng          | Instance cũ chưa đóng                            | Dùng `port: 0` để OS chọn cổng tự do                                     |

## Fixture thủ công `docs-for-test`

`docs-for-test/` là thư mục fixture dùng để test/kiểm chứng thủ công, **không được code tự động nào import**. Dùng khi cần nhanh chóng serve hoặc export để quan sát hành vi thực tế.

### Khi nào dùng

- Muốn xem cách `mdsvr` render một trang, component, hoặc theme cụ thể.
- Kiểm tra validator với các file lỗi mẫu (`test-validator-do-not-run-autofix/`).
- So sánh output giữa serve mode và static export trước khi áp dụng thay đổi cho `docs/` chính thức.

### Cách dùng

```bash
# Serve folder này local để kiểm tra trực quan
npm run start -- ./docs-for-test --port 1800

# Export static để so sánh output
npm run start -- ./docs-for-test --export ./docs-for-test/_html

# Validate markdown (KHÔNG dùng --autofix vì có folder `test-validator-do-not-run-autofix`)
npm run start -- ./docs-for-test --validate-md
```

### Lưu ý

- **Không chạy `--autofix` toàn folder**: một số file trong `test-validator-do-not-run-autofix/` được tạo ra để test các lỗi validator, việc autofix sẽ làm mất tính đại diện của fixture.
- `docs-for-test/_html/` và `docs-for-test/_mdsvr/export-state.json` là generated output, không nên commit nếu thay đổi.
- Nếu thêm fixture mới, đặt tên thư mục mô tả rõ mục đích, ví dụ `test-validator-do-not-run-autofix`.

## Ghi chú

- `dist/` và `dist-test/` là output build. Không sửa trực tiếp.
- Các file trong `agent/implementation-guide/` là lịch sử; nếu thấy conflict với source hiện tại, ưu tiên source + test đang chạy.
