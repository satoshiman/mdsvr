# Hướng dẫn release cho agent

Tài liệu này tóm tắt **quy trình release thủ công** của `mdsvr`. Các bước publish npm được tách ra để user tự chạy lệnh.

> Chỉ thực hiện release khi được yêu cầu rõ ràng. Không tự động push, publish, hoặc merge nếu user chưa xác nhận.

## Các loại release

| Loại  | Khi nào dùng                  | Lệnh bump version   |
| ----- | ----------------------------- | ------------------- |
| Patch | Bug fix, refactor nhỏ, docs   | `npm version patch` |
| Minor | Tính năng mới, không breaking | `npm version minor` |
| Major | Breaking changes              | `npm version major` |

`npm version *` tự động:

1. Bump version trong `package.json`.
2. Tạo git commit `vX.Y.Z`.
3. Tạo git tag `vX.Y.Z`.

> Không dùng `npm run release:*` vì các lệnh đó kết hợp cả bump version và `npm publish` trong một bước.

## Checklist trước khi release

1. [ ] Working tree sạch, không còn thay đổi chưa commit.
2. [ ] Chạy `npm test` thành công ở local.
3. [ ] Kiểm tra commit message tuân thủ Conventional Commits (dùng `@commitlint/config-conventional`).
4. [ ] Đối chiếu `.github/workflows/pr-check.yml` để đảm bảo CI sẽ pass (build + test + commitlint).

## Quy trình release thủ công

### 1. Cập nhật docs nếu có thay đổi

Nếu sửa file trong `docs/`, cần commit các thay đổi source. Để kiểm tra output trước:

```bash
npm run docs:generate
# Output nằm trong ./gh-pages/docs (gitignored, action sẽ regenerate khi deploy)
```

Commit file `docs/**` nếu có thay đổi. Không commit `gh-pages/docs/*` vì folder này được tạo lại bởi GitHub Actions.

### 2. Bump version

```bash
cd /Users/apple/md-serve
npm version patch
# hoặc: npm version minor
# hoặc: npm version major
```

Sau bước này:

- `package.json` đã được cập nhật.
- Có commit `vX.Y.Z`.
- Có tag `vX.Y.Z` local.

### 3. Login npm

> Agent **KHÔNG** tự động chạy `npm login`. Hãy đưa lệnh cho user.

```bash
cd /Users/apple/md-serve
npm login
```

User sẽ mở browser để xác thực. Kiểm tra bằng:

```bash
npm whoami
```

### 4. Publish lên npm

> Agent **KHÔNG** tự động chạy `npm publish`. Hãy đưa lệnh cho user.

```bash
cd /Users/apple/md-serve
npm publish
```

Nếu tài khoản bật 2FA, npm sẽ yêu cầu OTP hoặc mở browser authenticate. Sau khi thành công, output sẽ hiển thị `+ mdsvr@X.Y.Z`. Lưu ý package có thể mất vài phút mới propagate hết registry.

### 5. Push lên GitHub

Push commit và tag để trigger các GitHub Actions:

```bash
cd /Users/apple/md-serve
git push origin <branch> && git push origin --tags
```

Nếu đang ở nhánh release (ví dụ `release/v2.3.4`), push nhánh đó. Sau đó tạo PR merge vào `main`.

## Các workflow GitHub Actions

### GitHub Pages docs deploy

`.github/workflows/deploy-gh-pages.yml` chạy khi **push lên `main`** nếu thay đổi nằm trong `docs/**` hoặc `gh-pages/**`:

1. `npm ci`
2. `npm run build`
3. `npm run docs:generate` → tạo `gh-pages/docs/`
4. Deploy `./gh-pages` lên GitHub Pages

### Docker image release

`.github/workflows/docker-release.yml` chạy khi một **PR được merge vào `main`** và nhánh source có tên chứa `release` (ví dụ `release/v2.3.4`):

- Build multi-platform image (`linux/amd64`, `linux/arm64`).
- Push lên `ghcr.io/satoshiman/mdsvr:X.Y.Z` và `ghcr.io/satoshiman/mdsvr:latest`.

Do đó, để có Docker image, cần:

1. Push nhánh release lên remote.
2. Tạo PR từ nhánh release → `main`.
3. Merge PR.

## Sau release

1. [ ] Kiểm tra package trên npm: `npm view mdsvr@X.Y.Z version`.
2. [ ] Kiểm tra tag đã push: `git ls-remote --tags origin`.
3. [ ] Kiểm tra GitHub Actions chạy thành công (docs deploy, Docker image).
4. [ ] Log event trong `agent/`:

```bash
cd /Users/apple/md-serve/agent
python3 event.py log \
  --type Chore \
  --title "Release v$(node -p \"require('../package.json').version\")" \
  --scope "package.json" \
  --desc "Bump version and publish to npm"
```

## Những điều KHÔNG nên làm

- Không chạy `npm publish` thay user trừ khi user cung cấp OTP hoặc xác nhận rõ ràng.
- Không commit `dist/`, `dist-test/`, `gh-pages/docs/*` bằng tay — đây là generated output.
- Không để working tree dirty khi chạy `npm version` vì lệnh sẽ commit + tag.
- Không push hoặc merge trừ khi user đã xác nhận.
