# G2 — CI bằng GitHub Actions

**Trạng thái:** chưa làm. **Ước lượng:** 1–2 giờ. **Phụ thuộc:** G1.

## Mục tiêu

Mỗi push và pull request tự chạy typecheck, build, contract check, test trên MySQL thật và build Docker image. Tag `v*` thì đẩy image lên registry. **Không tự deploy.**

## Phạm vi file

`.github/workflows/ci.yml`, `.github/workflows/release.yml`, README (badge và giải thích).

## Thiết kế

- `ci.yml` (trên push và pull_request):
  - `actions/setup-node` Node 24 có cache npm.
  - Service container `mysql:8.4` có healthcheck. `TEST_DATABASE_URL` dùng user root của service. Đây chỉ là mật khẩu cho CI tạm thời, không phải secret thật.
  - Các bước: `npm ci`, `npm run format:check`, `typecheck`, `build`, `contract:check`, rồi chạy từng suite test.
  - Job `docker`: `docker/build-push-action` với `push: false` để chắc chắn Dockerfile build được, có cache GHA.
- `release.yml` (trên tag `v*.*.*`): build image và push lên **GHCR** (`ghcr.io/<owner>/harmea`) với `GITHUB_TOKEN` và quyền `packages: write`, tag theo version và sha. Image public hay private thì hỏi người dùng. Nếu người vận hành cần registry khác (ví dụ ECR) thì họ tự pull từ GHCR rồi push lại, hoặc cung cấp cấu hình sau; task này không cấu hình quyền AWS.
- Pin version cho mọi action (theo major tag ổn định hoặc commit SHA). `permissions` mặc định là `contents: read`.
- Không in secret hay `.env` ra log.

## Hoàn thành khi

YAML hợp lệ (kiểm tra bằng `actionlint` nếu cài được, nếu không thì ghi rõ). Chạy lại các lệnh tương đương trên máy local để chứng minh các bước qua. Báo cáo ghi rõ **workflow chưa chạy trên GitHub** cho tới khi người dùng push.

## Prompt giao việc

```text
Thực hiện task G2 trong tasks/G2-ci.md. Đọc tasks/00-ROADMAP-v2.md, package.json, Dockerfile và cách test dùng TEST_DATABASE_URL.

Viết ci.yml (Node 24, service MySQL 8.4, format/typecheck/build/contract/test, docker build không push) và release.yml (push GHCR khi có tag, không cấu hình AWS). Pin version action, permissions tối thiểu, không deploy tự động.

Kiểm tra YAML và chạy các bước tương đương trên máy local. Viết báo cáo docs/qa/<ngày>-task-G2.md, commit trên nhánh feat/G2-ci. Không push.
```
