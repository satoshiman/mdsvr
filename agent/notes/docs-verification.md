# Hướng dẫn verify docs cho agent

Tài liệu này giúp agent **kiểm tra tài liệu Markdown/MDX** của dự án `mdsvr` trước khi coi là hoàn thành.

## Cấu trúc docs

```
docs/
├── README.md                 # Trang chủ docs (bắt buộc)
├── 01-getting-started/
│   └── README.md
├── 02-settings/
│   └── README.md
├── 03-features/
│   ├── README.md
│   ├── markdown.md
│   ├── mdx.mdx
│   └── ...
├── 04-reference/
│   └── README.md
└── _mdsvr/
    └── settings.json         # Cấu hình site
```

## Quy tắc file và liên kết

### Đặt tên file

| Quy tắc                           | ✅ Đúng                 | ❌ Sai                 |
| --------------------------------- | ----------------------- | ---------------------- |
| Kebab-case                        | `getting-started.md`    | `GettingStarted.md`    |
| Dùng prefix số cho thứ tự sidebar | `01-guide.md`           | `guide.md`             |
| Không dùng dấu chấm giữa tên      | `config-v2.md`          | `config.v2.md`         |
| Index thư mục phải là `README.md` | `02-settings/README.md` | `02-settings/index.md` |

### Liên kết

| Quy tắc                             | ✅ Đúng                                        | ❌ Sai                                           |
| ----------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| Relative path                       | `[Guide](./03-features/README.md)`             | `[Guide](/docs/03-features)`                     |
| Không đuôi `.md`                    | `[Guide](./03-features/markdown)`              | `[Guide](./03-features/markdown.md)`             |
| Link đến thư mục, không phải README | `[Settings](./02-settings)`                    | `[Settings](./02-settings/README.md)`            |
| Anchor khớp heading                 | `[Search](#search)` nếu có heading `## Search` | `[Search](#tim-kiem)` khi heading là `## Search` |

### Frontmatter

Mỗi file docs nên có frontmatter:

```yaml
---
title: "Page Title"
description: "Mô tả một câu về nội dung trang."
---
```

## Các bước verify docs

### 1. Validate Markdown

```bash
# Kiểm tra broken links, heading hierarchy, missing H1, missing assets
npm run start -- ./docs --validate-md

# Tự động sửa broken links (chỉ khi hiểu rõ tác động)
npm run start -- ./docs --validate-md --autofix
```

#### Dùng `docs-for-test` làm fixture kiểm chứng validator

`docs-for-test/test-validator-do-not-run-autofix/` chứa các file Markdown mẫu để kiểm chứng hành vi validator thủ công. Dùng khi cần xác nhận validator phát hiện đúng lỗi (broken link, heading hierarchy, missing H1, missing asset, v.v.).

```bash
# Validate folder fixture (KHÔNG dùng --autofix)
npm run start -- ./docs-for-test --validate-md
```

> Lưu ý: folder `test-validator-do-not-run-autofix` được đặt tên để nhắc nhở không chạy autofix, vì các file lỗi là cố ý.

### 2. Validate settings

```bash
npm run start -- ./docs --validate
```

### 3. Build và export docs

```bash
# Tạo static site trong ./gh-pages/docs
npm run docs:generate
```

Kiểm tra output:

- `gh-pages/docs/index.html` tồn tại.
- Các trang con được render thành HTML.
- OG image, sitemap, RSS được tạo nếu cấu hình bật.
- Không có file bị mất hoặc link 404.

### 4. Serve local và kiểm tra trực quan

```bash
npm run start -- ./docs --port 1800 --open
```

Nếu không thể mở browser tự động, mở `http://localhost:1800` và kiểm tra:

- Sidebar navigation hiển thị đúng thứ tự.
- Dark/light mode hoạt động.
- Search (`⌘K` / `Ctrl+K`) tìm được từ khóa.
- Mermaid diagrams render (nếu có).
- Code blocks có toolbar copy/wrap/fullscreen.
- Các liên kết internal không bị 404.

### 5. Kiểm tra liên kết trong generated HTML

```bash
# Tìm kiếm các href có dấu hiệu sai định dạng
grep -R 'href=".*\.md"' gh-pages/docs || true
```

Nếu tìm thấy link `.md`, đó là lỗi cần sửa trong source.

## Checklist khi sửa/thêm docs

1. [ ] File đặt đúng vị trí và tên theo quy ước.
2. [ ] Có frontmatter với `title` và `description`.
3. [ ] Trang bắt đầu bằng H1 (`# Title`).
4. [ ] Heading không skip level (không H1 → H3).
5. [ ] Link internal dùng relative path, không có đuôi `.md`.
6. [ ] Chạy `--validate-md` và `--validate` thành công.
7. [ ] Chạy `npm run docs:generate` thành công.
8. [ ] Serve local hoặc xem generated HTML để xác nhận hiển thị.

## Verify docs khi release

Trước release có thay đổi docs:

1. Chạy `npm run docs:generate`.
2. Kiểm tra diff của `gh-pages/docs` (nếu repo track folder này).
3. Đảm bảo workflow `deploy-gh-pages.yml` sẽ chạy khi merge lên `main`.

## Các lỗi thường gặp

| Triệu chứng                        | Nguyên nhân                                    | Cách sửa                                        |
| ---------------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| Sidebar không hiển thị đúng thứ tự | Thiếu prefix số hoặc tên file không kebab-case | Đổi tên file theo quy tắc                       |
| Link 404 khi click                 | Dùng đuôi `.md` hoặc absolute path             | Sửa thành relative path không có `.md`          |
| Mermaid không render               | Thiếu container hoặc syntax sai                | Kiểm tra `flowchart TD`, `subgraph id["Label"]` |
| OG image sai                       | `settings.json` hoặc basePath không đúng       | Kiểm tra cấu hình SEO                           |
| Build generated thiếu file         | `ignorePatterns` hoặc `staticFolders` loại bỏ  | Rà soát `docs/_mdsvr/settings.json`             |
