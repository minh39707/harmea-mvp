# G2 — CI và đẩy image lên Docker Hub

**Trạng thái:** đã triển khai workflow, smoke và sửa fallback; chưa chạy GitHub Actions hoặc Docker/MinIO runtime do Engine chưa chạy. **Ước lượng:** 1,5–2 giờ. **Phụ thuộc:** G1. Báo cáo: [G2](../docs/qa/2026-11-11-task-G2.md).

**Bổ sung sau review G1 ngày 11/11/2026:** nghiệm thu các mục Docker còn thiếu trên Linux; sửa fallback cho asset không tồn tại theo yêu cầu bên dưới. Khắc phục font/favicon/format được ghi trong [báo cáo G1](../docs/qa/2026-11-11-task-G1.md).

G1b đã được người dùng chọn: job test cần chạy thêm `test:storage`, build/chạy MinIO bằng `compose.storage-test.yaml`, rồi chạy `test:storage:s3` trên MySQL thật. Suite S3 hiện chưa được nghiệm thu do máy dev không chạy Docker Engine; không coi unit test S3 là thay thế kiểm tra MinIO.

## Mục tiêu

- Mỗi push và pull request: typecheck, build, contract check, test trên MySQL thật, **build image `linux/amd64` và chạy đúng tiêu chí nghiệm thu `/health` của người vận hành**. Bước này cũng thay cho việc nghiệm thu Docker nếu máy dev chưa có Docker.
- Khi push tag `v*`: đẩy image lên **Docker Hub** với tên `<dockerhub-user>/harmea-web`, tag theo version. **Không dùng mỗi `latest`.**
- **Không tự deploy lên server.**

## Cần người dùng cung cấp

- Tên tài khoản Docker Hub (`<dockerhub-user>`). Cho tới khi có, dùng biến `vars.DOCKERHUB_USERNAME`, không hard-code.
- Trong GitHub repo Settings → Secrets: `DOCKERHUB_USERNAME` và `DOCKERHUB_TOKEN` (access token quyền Read & Write, **không** dùng mật khẩu tài khoản). Agent chỉ viết hướng dẫn, không tạo secret.

## Phạm vi file

`.github/workflows/ci.yml`, `.github/workflows/release.yml`, `scripts/docker-smoke.sh`, `CHANGELOG.md`, README (badge và hướng dẫn release), `DEPLOY.md` (mục tên image, phối hợp với G3). Sửa lại `apps/api/src/app.ts` và `tests/smoke.mjs` cho lỗi fallback còn lại từ R4.

## Fallback cho asset không tồn tại

- Sau static middleware, GET có đuôi file ở đoạn cuối đường dẫn mà không có file thật phải trả 404, không trả `index.html` với status 200. Bao gồm asset JS/CSS, ảnh, favicon và font; xử lý cả dấu chấm được URL-encode.
- Thêm kiểm tra HTTP cho `/assets/missing.js`, `/images/missing.png`, `/fonts/missing.woff2` và đường dẫn có đuôi file ở ngoài các thư mục này. Xác nhận body không chứa app shell; thử cả GET và HEAD.
- Asset thật vẫn trả đúng nội dung/content type và cache headers. Route SPA không có đuôi file như `/some/deep/path` vẫn trả app shell; API lạ vẫn JSON 404 và admin khi gate tắt vẫn 404.
- Giữ điều kiện R4: HTML/CSS của `/track` không tải tài nguyên bên thứ ba, font phục vụ từ repo; favicon kiểm tra theo đường dẫn khai báo thực tế và phải trả ảnh thật.

## Thiết kế

### `ci.yml` (push, pull_request)
- Job `test`: `actions/setup-node` Node 24 có cache npm. Service container `mysql:8.4.x` có healthcheck. `TEST_DATABASE_URL` dùng user root của service. Đây chỉ là mật khẩu tạm của CI, không phải secret thật. Các bước: `npm ci`, `format:check`, `typecheck`, `build`, `contract:check`, rồi chạy từng suite test.
- Job `docker` (cần `test` qua trước):
  - `docker/setup-buildx-action`, `docker/build-push-action` với `platforms: linux/amd64`, `load: true`, `push: false`, tag `harmea-web:test`, có cache GHA.
  - Chạy `scripts/docker-smoke.sh`:
    1. Tạo file `.env` tạm từ `.env.example`, thay các giá trị CHANGE_ME bằng giá trị ngẫu nhiên.
    2. `docker run -d -p 3000:3000 --env-file .env harmea-web:test`, chờ tối đa 30 giây cho tới khi `curl -fsS http://localhost:3000/health` trả 200.
    3. Kiểm tra `docker inspect`: user là `node`, image có HEALTHCHECK, architecture là `amd64`.
    4. `docker stop` (gửi SIGTERM): container phải thoát với mã 0 trong 15 giây.
    5. Chạy `docker network create web`, rồi `docker compose up -d --build --wait`, chạy migrate qua `docker compose run --rm app ...` và kiểm tra `/ready` bằng `docker compose exec app node -e "fetch('http://127.0.0.1:3000/ready')..."`. Xong thì `docker compose down -v` (CI được dùng `-v` vì là môi trường tạm).
- `permissions: contents: read`.

### Nghiệm thu G1 còn thiếu trên Linux

`scripts/docker-smoke.sh` phải kiểm tra đủ các mục 1–6 của G1, bổ sung cho các bước trên:

- Ghi kích thước image thực tế; kiểm tra UID runtime của user `node`, nội dung image không chứa `.env*`, `.local-admin.txt`, dữ liệu storage của máy build, `.git`, tests, docs hoặc tasks.
- Qua Compose với DB đã migrate và gate bật trong môi trường CI tạm: tạo đơn bằng ảnh fixture, tra cứu bằng mã đơn + SĐT, mở admin và tải ảnh riêng qua API admin. Khi gate tắt, trang/API admin trả 404. Không log SĐT, body đặt hàng hoặc URL nhạc.
- Sau `docker compose down` rồi `up` **không có `-v`**, xác nhận đơn và bytes ảnh còn nguyên. Chỉ dùng `down -v` ở bước cleanup cuối và chỉ cho project CI tạm do script tạo.
- Xác nhận app/db không publish cổng trong Compose chính, DB chỉ nằm trên `backend` internal và không publish ra host. Nếu cần kiểm tra qua HTTP từ host, ghép override loopback cục bộ; giữ nguyên file Compose chính.
- Kiểm tra app standalone và app Compose đều dừng với exit code 0 trong tối đa 15 giây khi nhận SIGTERM. Test `test:runtime` phải chạy case SIGTERM trên Linux.
- Smoke Compose chính chạy với `STORAGE_DRIVER=local` (mặc định). Image phải chạy được `node scripts/migrate-uploads-to-s3.mjs --help` (xác nhận script và source storage đã có trong image), nhưng không gọi S3 thật.
- Dùng project/volume/env tạm, cleanup bằng trap cả khi lỗi; không ghi đè `.env` riêng hoặc xóa volume/network của người dùng. Khi chạy release, smoke phải dùng đúng image vừa build ở cả standalone lẫn Compose.

### `release.yml` (push tag `v*`, ví dụ `v1`, `v1.2.0`)
- Login bằng `docker/login-action` với secret Docker Hub.
- Build `linux/amd64`, push với các tag: `<user>/harmea-web:<tag-git>` (ví dụ `v1`), `<user>/harmea-web:sha-<shortsha>`, và `latest` (chỉ là tag phụ, DEPLOY.md luôn ghi tag version).
- Thêm label OCI (`org.opencontainers.image.version`, `revision`, `source`).
- Chạy lại `docker-smoke.sh` trên image vừa build trước khi push.
- Nếu thiếu secret thì job dừng với thông báo rõ ràng.

### Đẩy thủ công (khi chưa dùng CI)
Ghi trong README:

```bash
docker login
docker buildx build --platform linux/amd64 -t <user>/harmea-web:v1 --push .
```

Agent **không** chạy `docker login` và **không** push.

### Quy ước version
- Tag git `vN` (hoặc semver `vN.M.K`) gắn với tag image cùng tên. Mỗi release cập nhật `CHANGELOG.md`, ghi **"Có migration: có/không"** để người vận hành biết có cần chạy migrate không.
- Pin version cho mọi action (theo major tag ổn định hoặc commit SHA).

## Hoàn thành khi

YAML hợp lệ (dùng `actionlint` nếu cài được, nếu không thì ghi rõ). `docker-smoke.sh` qua `shellcheck` và đã chạy thành công trên máy local nếu có Docker; nếu không có thì ghi chưa chạy. Asset không tồn tại trả 404 và smoke không tải font bên thứ ba. Báo cáo ghi riêng kết quả từng mục Docker của G1, **workflow chưa chạy trên GitHub** cho tới khi người dùng push, và liệt kê secret người dùng phải tạo. Việc viết workflow chưa được tính là đã nghiệm thu Docker.

## Prompt giao việc

```text
Thực hiện task G2 trong tasks/08-G2-ci-dockerhub.md. Đọc tasks/00-ROADMAP.md, package.json, Dockerfile, docker-compose.yml, .env.example, báo cáo G1 và cách test dùng TEST_DATABASE_URL.

Viết ci.yml: test trên Node 24 với service MySQL 8.4, gồm cả test:storage (driver local) và test:storage:s3 trên MinIO build từ compose.storage-test.yaml (không gọi AWS thật, không coi unit test S3 là thay thế); job docker build linux/amd64 không push, rồi chạy scripts/docker-smoke.sh kiểm tra đủ mục 1–6 G1: /health khi không có DB, user node, healthcheck, amd64, kích thước/nội dung image, SIGTERM, compose với network web và /ready, migrate, tạo đơn/lookup/admin/ảnh, giữ đơn và bytes ảnh qua down/up không -v, DB không publish cổng. Case SIGTERM của test:runtime phải chạy trên Linux. Sửa fallback app.ts để asset có đuôi file không tồn tại trả 404 (kèm HTTP tests), giữ route SPA, API/gate và điều kiện không tải tài nguyên ngoài của R4. Viết release.yml push lên Docker Hub <user>/harmea-web theo tag vN (kèm sha, latest chỉ là phụ), dùng secret DOCKERHUB_USERNAME/DOCKERHUB_TOKEN. Smoke dùng đúng image vừa build trước push, có env/project/volume tạm và cleanup không đụng dữ liệu người dùng. Thêm CHANGELOG.md có ghi chú migration. Pin version action, permissions tối thiểu, không deploy, không login hay push từ máy local.

Kiểm tra YAML và shellcheck; chạy smoke trên máy nếu có Docker. Viết báo cáo docs/qa/<ngày>-task-G2.md. Không commit, không tạo nhánh, không push: để thay đổi trong working tree cho Claude kiểm tra.
```
