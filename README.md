# Harméa MVP

[![CI](https://github.com/minh39707/harmea-mvp/actions/workflows/ci.yml/badge.svg)](https://github.com/minh39707/harmea-mvp/actions/workflows/ci.yml)

Website demo đặt một sản phẩm NFC Music Card. Phạm vi hiện tại là MySQL 8.4, giỏ hàng, checkout khách không tài khoản và tra cứu đơn bằng mã đơn + số điện thoại. Không có đăng nhập khách/admin, thanh toán, email hoặc tự động giao hàng. Xem [roadmap](tasks/00-ROADMAP.md) và [yêu cầu](docs/01-requirements.md).

## Trạng thái roadmap

| Task | Trạng thái |
|---|---|
| F0–F2 | Xong; xem `tasks/done/` và báo cáo F2 |
| R1 — gỡ login, admin gate, lookup mã + SĐT | Xong; xem [báo cáo R1](docs/qa/2026-11-11-task-R1.md) |
| R2 — lưu giỏ/ảnh trên thiết bị và nén ảnh | Đã triển khai; còn browser QA/đo phía client ([báo cáo](docs/qa/2026-11-11-task-R2.md)) |
| R3 — admin sản phẩm/thống kê/xuất CSV | Đã triển khai; xem [báo cáo R3](docs/qa/2026-11-11-task-R3.md). Còn kiểm tra trực quan trên trình duyệt |
| R4 — router, nội dung, SEO | Đã triển khai; xem [báo cáo R4](docs/qa/2026-11-11-task-R4.md). Còn browser QA |
| G1 — Docker runtime | Đã qua CI Linux và nghiệm thu image local; xem [H](docs/qa/2026-11-11-acceptance.md) |
| G2 — CI và release Docker Hub | CI/release xanh; đã phát hành `hainam164/harmea-web:v1.1.0`, commit `e5c17ef`; [digest/bằng chứng](docs/qa/2026-11-11-release-v1.1.0.md) |
| G3 — bàn giao | Backup/xóa volumes/restore đã qua trong CI release; persistence local qua. Chưa triển khai server; xem [H](docs/qa/2026-11-11-acceptance.md) |
| G1b — storage local/S3 | MinIO/S3 đã qua trên CI và Docker local; chưa kiểm tra AWS thật |
| H — nghiệm thu cuối | Browser trên đúng digest `v1.1.0` PASS (12 checks, 18 layout); người dùng chưa thử ảnh điện thoại thật/Excel, chưa nghiệm thu server ([báo cáo release](docs/qa/2026-11-11-release-v1.1.0.md)) |
| R5 thanh toán | Tùy chọn, tạm bỏ qua theo yêu cầu người dùng |

Task F3/F4 cũ đã hủy; báo cáo của chúng được giữ làm lịch sử. UI storefront hiện có tiếp tục được dùng và có thể chỉnh sau.

## Công nghệ và thư mục

- Web: React, TypeScript, Vite.
- API: Express, TypeScript, Node.js 24.
- DB: MySQL 8.4 qua `mysql2`, SQL có tham số và adapter `apps/api/src/db.ts`.
- Ảnh đơn nằm trong `storage/uploads` mặc định hoặc bucket S3 private nếu chọn driver S3; chỉ tải qua API admin khi gate bật.

```text
apps/web/src/features/    home, editor, cart, checkout, tracking, admin
apps/api/src/modules/     admin, catalog, orders
database/                 migration MySQL checksum
database/postgres-legacy/ migration cũ chỉ để đọc lịch sử
contracts/openapi.json    API contract 0.7.0
tasks/                    roadmap và từng task
tests/                    integration MySQL, smoke và editor
docs/qa/                  báo cáo kết quả đã chạy
```

Không có bảng user/session và không lưu auth vào web storage. Checkout giữ UUID + fingerprint của request chưa rõ kết quả trong sessionStorage `harmea.checkout.pending.v1`; không lưu raw phone, body, token hay URL nhạc trong record đó.

Giỏ lưu metadata ở localStorage và mỗi thiết kế có Blob ảnh riêng trong IndexedDB. Trình duyệt chuẩn hóa ảnh theo EXIF, nén JPEG quality 0.85, cạnh dài tối đa 2400 px; API xác thực lại, xoay theo EXIF, chuyển sRGB và mã hóa mozjpeg quality 82. Ảnh chỉ được tải lên khi đặt đơn.

Font DM Sans và Playfair Display được lưu trong `apps/web/public/fonts` cùng giấy phép và nguồn tải; trình duyệt tải font từ cùng origin, kể cả ở `/track`. Không cần truy cập Google Fonts khi build hoặc chạy app. Kết quả khắc phục font/favicon và các kiểm tra sau review nằm ở cuối [báo cáo G1](docs/qa/2026-11-11-task-G1.md).

## Cài đặt và chạy local

Trong PowerShell từ thư mục dự án:

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run setup
```

`setup` tạo `.env` local với MySQL ở `127.0.0.1`, `APP_URL=http://localhost:5173` và `LOOKUP_SECRET` ngẫu nhiên. Nếu `.env` cũ còn `HOST=127.0.0.1`, `PORT=4000` và `APP_URL=http://localhost:4000` mặc định, lần chạy `setup` tiếp theo sẽ bỏ/cập nhật các giá trị đó mà giữ URL DB và secret hiện có. Muốn API chỉ nghe loopback khi phát triển, tự thêm `HOST=127.0.0.1` vào `.env`; mặc định API nghe `0.0.0.0` để hoạt động trong container. Giữ `.env` riêng tư; không commit hoặc đưa vào ZIP bàn giao.

Khởi động MySQL local bằng Compose dev:

```powershell
npm.cmd run db:up
# hoặc: docker compose -f compose.dev.yaml up -d --wait db
npm.cmd run db:migrate
```

Nếu runner báo migration `005_r1_finalize_lookup.sql` bị hoãn vì đơn cũ chưa có HMAC, chạy:

```powershell
npm.cmd run db:backfill-lookup
npm.cmd run db:migrate
```

Migration `006_r3_admin_products.sql` thêm mô tả/version sản phẩm, giới hạn giá và lịch sử đổi giá. Không sửa các migration đã áp dụng; `db:migrate` sẽ áp migration mới.

Sau đó chạy:

```powershell
npm.cmd run db:check
npm.cmd run dev
```

Web ở `http://127.0.0.1:5173`, API ở `http://127.0.0.1:3000/api/health`; `/health` kiểm tra tiến trình không phụ thuộc DB/storage, còn `/ready` kiểm tra MySQL và quyền ghi/xóa qua driver storage đang chọn. Nếu DB/storage mất kết nối, API vẫn chạy và endpoint cần backend đó trả `503`. `/track` nhận mã đơn và SĐT trong form. Local dev bật admin mặc định tại `/admin`.

### Migration đã áp dụng

DB local đã áp `001_init.sql` đến `006_r3_admin_products.sql`. File `003_users.sql` được giữ nguyên do đã áp dụng và không còn ảnh hưởng schema sau migration R1. Migration `004_r1_remove_auth_add_lookup.sql` xóa bảng/cột auth và thêm `lookup_phone_hash` nullable. Script Node backfill HMAC từ recipient snapshot; migration `005_r1_finalize_lookup.sql` đặt cột NOT NULL và xóa `tracking_token_hash`. Migration 006 thêm mô tả/version sản phẩm và lịch sử giá. Không chỉnh file migration đã áp dụng để né checksum.

### Gate admin và production

- `ADMIN_ENABLED` mặc định true ngoài production, false khi `NODE_ENV=production`.
- Khi gate tắt, `/api/admin*` trả JSON 404 chung và `/admin*` trả trang 404.
- Khi triển khai, chỉ bật `ADMIN_ENABLED=true` sau khi reverse proxy chặn `/admin*` và `/api/admin*` (Basic Auth hoặc giới hạn IP).
- Production thiếu `LOOKUP_SECRET` tối thiểu 32 byte thì API từ chối khởi động.
- Bộ đếm lookup lưu trong memory, chỉ phù hợp một API instance.
- `APP_URL` là biến chính cho Origin, `robots.txt` và `sitemap.xml`; `APP_ORIGIN` chỉ còn là giá trị dự phòng có cảnh báo một lần.

### Docker

`compose.dev.yaml` chỉ chạy MySQL local. `docker-compose.yml` là cấu hình container production: app và MySQL không publish cổng; app nối network external `web` để Caddy của người vận hành gọi `app:3000`, còn MySQL chỉ ở network `backend` internal. Cấu hình không chứa Caddy, không triển khai cloud và không bật `ADMIN_ENABLED`.

Để dùng Compose production, cấu hình `.env` theo `.env.example`, thay mọi `CHANGE_ME`, đặt `DATABASE_URL` dùng host `db`, rồi tạo network dùng chung một lần. Đừng ghi đè `.env` local đang có; bảo đảm file dùng cho Compose chứa cấu hình production trước khi chạy lệnh migrate:

```powershell
# Chỉ tạo từ mẫu nếu chưa có .env; nếu đã có, giữ file và chỉnh cấu hình có chủ đích.
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Thay CHANGE_ME bằng giá trị riêng và đặt DATABASE_URL dùng host db trong .env.
docker network create web
docker compose run --rm app node scripts/migrate.ts
docker compose up --build -d
```

Compose chính không có `ports`. Để truy cập app từ máy local, có thể ghép override loopback: `docker compose -f docker-compose.yml -f docker-compose.local.yml up --build`. Dữ liệu DB và upload dùng named volume; `docker compose down` không xóa volume nếu không thêm `-v`.

Máy phát triển hiện có Docker CLI nhưng Docker Engine chưa chạy. Vì vậy chưa xác nhận build image, runtime container, volumes hay luồng Docker; xem [báo cáo G1](docs/qa/2026-11-11-task-G1.md). Chưa cấu hình server/cloud hoặc proxy production.

### Bàn giao ứng dụng (G3)

Xem [DEPLOY.md](DEPLOY.md) cho biến môi trường, khởi tạo/cập nhật, admin gate và backup/restore. `npm.cmd run env:prod -- --out <file-ngoài-repo>` sinh mật khẩu và lookup secret mới, mặc định local; có `--image`, `--s3-bucket` và `--aws-region`. File thật gửi riêng, không đưa vào Git/ZIP. Giữ LOOKUP_SECRET cũ cùng dữ liệu đã có; không chạy `--force` để thay env đang sử dụng.

`deploy/backup.sh` và `deploy/restore.sh` dùng Compose ở mức ứng dụng; local gồm DB + ảnh, S3 chỉ gồm DB. Restore cần `--yes`, kiểm tra checksum/config trước khi thay dữ liệu. CI đã thêm diễn tập trên volume test riêng; chưa chạy Docker/server thật trong task.

### CI và release image (G2)

`.github/workflows/ci.yml` chạy các kiểm tra code, test MySQL thật, build/chạy MinIO cho test S3, sau đó build image amd64 và nghiệm thu Docker. Test SIGTERM chạy trên Linux. Workflow release gọi lại CI, build một image ứng viên và smoke chính image đó trước khi login/push; không triển khai server.

Người dùng tạo secret `DOCKERHUB_TOKEN` (Read & Write access token) và `DOCKERHUB_USERNAME` trong GitHub Settings; username cũng có thể dùng repository variable `DOCKERHUB_USERNAME`. Workflow dùng `<username>/harmea-web`, không hard-code tài khoản. Cập nhật `CHANGELOG.md` với section đúng version và dòng `Có migration: có/không` trước khi tự push tag `vN` hoặc `vN.M.K`. Image được gắn tag version, `sha-<12 ký tự commit>` và `latest`; triển khai dùng version cụ thể. Xem [DEPLOY.md](DEPLOY.md).

Nếu phát hành thủ công khi chưa dùng CI, người dùng tự đăng nhập/build/push từ môi trường tin cậy:

```bash
docker login
docker buildx build --platform linux/amd64 -t <user>/harmea-web:v1 --push .
```

Agent chỉ viết workflow/hướng dẫn, không chạy login/push hoặc tạo secret. CI/release chưa chạy trên GitHub; Docker runtime và MinIO vẫn chưa nghiệm thu ở máy phát triển do Engine không chạy.

### Storage local/S3 (G1b)

`STORAGE_DRIVER=local` là mặc định, giữ các khóa ảnh và volume hiện tại. Khi người vận hành đã cung cấp bucket private, Block Public Access, mã hóa SSE-S3 và IAM role có quyền đọc/ghi/xóa object dưới `uploads/`, đặt `STORAGE_DRIVER=s3`, `S3_BUCKET` và `AWS_REGION` trong `.env` riêng. Ứng dụng không tạo bucket/role, không dùng URL public/presigned và không mở thêm API ảnh. SDK đọc credential từ chuỗi provider mặc định (trên EC2 dùng instance role); factory từ chối AWS access key trong env và custom endpoint. Xem [AWS credential providers](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html).

Để phân biệt object chưa tồn tại qua `exists()`, người vận hành cần cung cấp thêm quyền bucket `s3:ListBucket`; thiếu quyền này S3 có thể trả 403 thay vì 404. Driver giữ lỗi quyền là 503, không coi đó là file không tồn tại; migration dừng để tránh bỏ qua lỗi cấu hình. Xem [AWS HeadObject permissions](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html).

`/health` vẫn độc lập DB/storage; `/ready` kiểm tra MySQL và ghi/xóa probe qua driver đang chọn. Backend storage không truy cập được trả 503; tệp không tồn tại trả 404 ở API admin. Không tự fallback sang local khi đã chọn S3. MinIO và credential thử chỉ có trong test harness, không nằm trong factory ứng dụng.

Chuyển ảnh cũ: dừng nhận đơn trong thời gian copy/đối chiếu, giữ `UPLOAD_DIR` trỏ tới thư mục local đang chứa ảnh, cấu hình bucket/region/role riêng rồi chạy:

```powershell
npm.cmd run storage:migrate-s3 -- --dry-run
# Chỉ người vận hành chạy khi đã chuẩn bị bucket và role:
npm.cmd run storage:migrate-s3
```

Dry-run chỉ đọc DB và ảnh local, không tạo S3 client. Lệnh thật chỉ copy các khóa ảnh được tham chiếu bởi đơn, giữ nguyên khóa trong DB, kiểm tra SHA-256 sau copy và bỏ qua object đã có cùng checksum. Checksum khác thì dừng và không ghi đè. File nguồn luôn được giữ; chuyển driver sau khi toàn bộ ảnh đã được đối chiếu. Không xóa bản local hoặc đổi driver ngược lại khi chưa đối chiếu các đơn mới.

Kiểm tra local: `npm.cmd run test:storage` (gồm MySQL thật). Khi Docker Engine chạy, thử MinIO bằng project tạm riêng:

```powershell
docker compose -f compose.storage-test.yaml -p harmea-storage-test up --build -d --wait
npm.cmd run test:storage:s3
docker compose -f compose.storage-test.yaml -p harmea-storage-test down
```

Service test chỉ bind loopback, dùng tmpfs và credential fixture công khai; không ghép vào Compose production. `S3_TEST_ENDPOINT` chỉ hỗ trợ HTTP loopback, mặc định `http://127.0.0.1:19000`. MinIO standalone chưa cấu hình KMS: suite S3 kiểm tra lưu/stream/cleanup/checksum, không nghiệm thu mã hóa SSE-S3 thực tế. Máy hiện chưa chạy Docker Engine nên MinIO/container và AWS thật chưa được nghiệm thu.

`tests/minio/Dockerfile` build MinIO từ commit chính thức `07c3a429bfed433e49018cb0f78a52145d4bedeb` của release `RELEASE.2025-09-07T16-13-09Z`, kèm giấy phép trong image test. Cần mạng để tải Go modules và nguồn khi build lần đầu. Cấu hình này thay cho image registry/binary MinIO không truy cập được ở lần kiểm tra; chưa xác nhận build trên Docker.

### Hai đơn demo

Chạy khi API đã dừng, DB đã migrate và `.env` có `LOOKUP_SECRET`:

```powershell
npm.cmd run demo:seed
```

Lệnh tạo hai order hư cấu hoặc giữ nguyên đơn fixture có sẵn; in mã đơn để kiểm tra trong `/track`. Không tạo `storage/demo-links.json`. SĐT demo là số giả trong payload seed; không dùng thông tin demo làm giao dịch thật. URL nhạc là placeholder chưa xác minh NFC.

## Test và kiểm tra

Các suite database cần `TEST_DATABASE_URL` trỏ tới MySQL local account có quyền tạo/xóa DB. Mỗi suite dùng DB `harmea_test_<random>` riêng và dọn sau khi chạy.

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run contract:check
npm.cmd run format:check
npm.cmd run test:api
npm.cmd run test:editor
npm.cmd run test:checkout
npm.cmd run test:admin
npm.cmd run test:admin-extended
npm.cmd run test:setup
npm.cmd run test:prod-env
npm.cmd run test:snapshots
npm.cmd run test:runtime
npm.cmd run test:storage
npm.cmd run test:docker-fixture
npm.cmd run test:router
npm.cmd run routes:check
npm.cmd run test:smoke
```

Không đánh dấu kiểm tra trực quan, Docker hoặc proxy là đạt nếu chưa chạy thật. Xem [`docs/04-acceptance-demo.md`](docs/04-acceptance-demo.md) và báo cáo QA trong `docs/qa/`.

## Bảo vệ dữ liệu

- Không ghi SĐT, địa chỉ, body đặt hàng, URL nhạc, secret hoặc cookie vào log.
- Không phục vụ public `storage/uploads`; API admin luôn qua `ADMIN_ENABLED`.
- Không commit `.env`, `.local-admin.txt`, `storage/`, `node_modules/` hoặc `.npm-cache/`.
- Không tự thêm ORM/framework/router, thanh toán hay dịch vụ ngoài phạm vi roadmap.
