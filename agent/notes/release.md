# Hướng dẫn release cho agent

Tài liệu này tóm tắt **quy trình release** của `mdsvr` và những việc agent nên làm khi chuẩn bị hoặc thực hiện release.

> Chỉ thực hiện release khi được yêu cầu rõ ràng. Không tự động push hoặc publish nếu user chưa xác nhận.

## Các loại release

| Loại | Khi nào dùng | Lệnh npm |
| ---- | ----------- | -------- |
| Patch | Bug fix, refactor nhỏ, docs | `npm run release:patch` |
| Minor | Tính năng mới, không breaking | `npm run release:minor` |
| Major | Breaking changes | `npm run release:major` |

Các lệnh trên tự động:
1. Bump version trong `package.json` và tạo git tag.
2. Chạy `prepublishOnly` → `npm run build && npm test`.
3. Publish lên npm registry.

## Checklist trước khi release

1. [ ] Đảm bảo working tree sạch, không còn thay đổi chưa commit.
2. [ ] Chạy `npm test` thành công ở local.
3. [ ] Kiểm tra `CHANGELOG` hoặc mô tả commit xem thay đổi có xứng đáng với semver level không.
4. [ ] Kiểm tra commit message tuân thủ Conventional Commits (dùng với `@commitlint/config-conventional`).
5. [ ] Nếu có thay đổi `docs/`, `gh-pages/` hoặc ảnh hưởng đến export, chạy `npm run docs:generate` và xem trước output.
6. [ ] Đối chiếu `.github/workflows/pr-check.yml` để đảm bảo CI sẽ pass (build + test + commitlint).

## Quy trình release (thủ công)

```bash
# 1. Kiểm tra trạng thái
git status
git log --oneline -5

# 2. Chạy test đầy đủ
npm test

# 3. Chọn loại release (ví dụ patch)
npm run release:patch

# 4. Push tag và commit lên remote (chỉ khi được phép)
git push && git push --tags
```

## GitHub Pages docs deploy

Workflow `.github/workflows/deploy-gh-pages.yml` tự động chạy khi push lên `main` nếu thay đổi nằm trong `docs/**` hoặc `gh-pages/**`.

Nếu muốn tạo output thủ công trước:

```bash
npm run docs:generate
# Output nằm trong ./gh-pages/docs
```

## Docker image release

Workflow `.github/workflows/docker-release.yml` tự động build và push multi-platform image (`linux/amd64`, `linux/arm64`) lên `ghcr.io` khi một PR có nhánh tên chứa `release` được merge vào `main`.

Nếu muốn build local:

```bash
bash docker-release.sh
```

Yêu cầu:
- `docker` + `docker buildx`
- Đã login `ghcr.io` nếu push

## Sau release

1. [ ] Log event trong `agent/` để lưu lịch sử:

```bash
cd /Users/apple/md-serve/agent
python3 event.py log \
  --type Chore \
  --title "Release v$(node -p \"require('../package.json').version\")" \
  --scope "package.json" \
  --desc "Bump version and publish to npm"
```

2. [ ] Kiểm tra package trên npm có version mới.
3. [ ] Kiểm tra GitHub Actions workflow chạy thành công (Docker image, docs deploy nếu có).

## Những điều KHÔNG nên làm

- Không chạy `npm publish` trực tiếp nếu có thể dùng `npm run release:*`.
- Không commit `dist/`, `dist-test/`, `gh-pages/` bằng tay — đây là generated output.
- Không để working tree dirty khi chạy `npm version` vì lệnh sẽ commit + tag.
- Không push trừ khi user đã xác nhận hoặc đây là workflow CI tự động.
