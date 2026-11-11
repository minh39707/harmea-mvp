# Bàn giao ứng dụng Harméa

**Chưa chạy trên server người vận hành.** CI/release `v1`, Docker local và MinIO đã chạy. Findings của H đã sửa; **candidate H-fix local PASS, chưa phát hành `v1.1.0`**. Chờ ảnh điện thoại thật/Excel, review/commit và nghiệm thu đúng digest release mới trước bàn giao. Xem [H gốc](docs/qa/2026-11-11-acceptance.md) và [H-fix](docs/qa/2026-11-11-task-H-fix.md). Người phụ trách gửi riêng image version/digest, Compose, tài liệu/scripts và `.env` thật qua kênh an toàn; loại `.env`, storage, backup, node_modules và cache khỏi Git/ZIP.

**1. Image.** `<dockerhub-user>/harmea-web:vN` hoặc `:vN.M.K`, platform `linux/amd64`; triển khai bằng version cụ thể. Ghi digest thật sau H, không dùng riêng `latest`. Release cần `DOCKERHUB_USERNAME` (secret hoặc repo variable), `DOCKERHUB_TOKEN` (secret Read & Write) và section version có dòng migration trong CHANGELOG. Workflow smoke image trước push, không tự deploy.

Image đã kiểm tra: `hainam164/harmea-web:v1`, commit `7fde77f`, digest `sha256:eb683458f154e5209bf2a6a7100de8bbd7481fe5391079f24549a0b49c5fd035`. Đây là bản có các lỗi H nêu trên, chưa phải xác nhận sẵn sàng mở bán. Giữ nguyên tag/digest này; sau review sửa lỗi, phát hành version mới và chạy lại H trên đúng digest mới.

**2. Kết nối.** Service/container `app`, cổng nội bộ `3000`, proxy của người vận hành gọi `app:3000` qua network external `web` đã được chuẩn bị. Compose chính không publish app/DB; DB chỉ nối `backend` internal. Proxy, DNS và hạ tầng do người vận hành quản lý; tài liệu không chứa Caddyfile hay runbook AWS.

**3. Health.** `/health` xác nhận tiến trình, độc lập DB/storage. `/ready` kiểm tra MySQL và ghi/xóa probe qua local/S3; trả 503 khi dependency chưa sẵn sàng.

**4. Env production.** Từ máy có source và Node 24, chọn thư mục riêng đã tồn tại ngoài repo:

```bash
npm run env:prod -- --out /private/harmea.env --image your-dockerhub-user/harmea-web:v1
# S3: thêm --s3-bucket <bucket> --aws-region <region>
```

Script sinh secret mới, quyền 0600 trên POSIX, chặn đường dẫn trong repo/alias/link và không ghi đè nếu thiếu `--force`. `--force` sinh lại mọi secret; không dùng để thay env đang vận hành. Nếu chưa truyền `--image`, phải đặt `APP_IMAGE` trước khi chạy. Gửi file riêng rồi người vận hành đặt thành `.env` cạnh Compose. Giữ nguyên `LOOKUP_SECRET` khi cập nhật/restore; bản sao env được lưu riêng, không nằm trong snapshot DB/ảnh.

| Biến | Bắt buộc / mặc định, ý nghĩa | Bí mật |
|---|---|---|
| `APP_IMAGE` | Production: image version đã nghiệm thu; default local của Compose chỉ dành dev | Không |
| `NODE_ENV`, `PORT` | `production`, `3000` | Không |
| `APP_URL` | `https://harmea.introd.xyz`, origin không có path | Không |
| `DATABASE_URL` | `mysql://harmea:<pw>@db:3306/harmea`, khớp password dưới | Có |
| `MYSQL_DATABASE`, `MYSQL_USER` | `harmea`, `harmea` | Không |
| `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` | Hai mật khẩu ngẫu nhiên khác nhau | Có |
| `LOOKUP_SECRET` | Ngẫu nhiên ít nhất 32 byte, giữ cùng dữ liệu HMAC | Có |
| `UPLOAD_DIR` | `/app/storage/uploads`; local phải nằm trong volume `/app/storage` | Không |
| `DB_CONNECTION_LIMIT` | Tùy chọn, `10` | Không |
| `MYSQL_BUFFER_POOL` | Tùy chọn, `1G` cho cấu hình máy 8 GB dự kiến | Không |
| `ADMIN_ENABLED` | Tùy chọn, `false`; chỉ bật sau khi proxy bảo vệ xong | Không |
| `PHOTO_MAX_EDGE`, `PHOTO_JPEG_QUALITY` | Tùy chọn, `2400`, `82` | Không |
| `STORAGE_DRIVER` | Tùy chọn, `local`; chọn `s3` khi đã có dịch vụ phù hợp | Không |
| `S3_BUCKET`, `AWS_REGION` | Bắt buộc khi S3; ví dụ bucket riêng, `ap-southeast-1` | Không |

Không đặt `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` hoặc endpoint tùy chỉnh: factory S3 của ứng dụng từ chối cấu hình đó.

**5. Lần đầu chạy.** Người vận hành chuẩn bị `.env`, image đã kiểm tra và network; chạy tại thư mục Compose:

```bash
chmod 600 .env
docker compose pull
docker compose up -d --wait db
docker compose run --rm --no-deps app node scripts/migrate.ts
docker compose up -d --no-build --wait app
```

Nếu DB cũ hoãn migration 005, giữ app dừng, chạy `docker compose run --rm --no-deps app node scripts/backfill-lookup.mjs`, rồi migrate lại trước khi bật app. Admin không có login trong ứng dụng: người vận hành chặn `/admin*` và `/api/admin*` ở proxy bằng Basic Auth/giới hạn IP, xác nhận bảo vệ rồi mới đặt `ADMIN_ENABLED=true` và recreate app. Bật gate trước khi proxy bảo vệ sẽ công khai dữ liệu admin.

**6. Cập nhật/rollback.** Backup → dừng app → đổi `APP_IMAGE` trong env → pull → nếu CHANGELOG có migration thì migrate khi app dừng → up `--no-build --wait app` → kiểm tra `/ready`. Chỉ quay tag cũ khi schema/data tương thích; migration không tự rollback. Nếu cần quay schema, chọn image/env của snapshot rồi restore; restore thay thế toàn bộ DB và dữ liệu local.

**7. Dữ liệu.** Giữ volumes `mysql_data` và `uploads` (`/app/storage`, gồm ảnh JPEG/PNG). H local đo 23 đơn giả/29 thiết kế, 58 ảnh, tổng 6.910.774 byte (khoảng 300.468 byte/đơn); fixture gồm ảnh màu tổng hợp và preview. Đây không phải trung bình ảnh khách thật, không dùng để dự báo dung lượng production. Một đơn có 1–10 thiết kế, mỗi thiết kế một cặp ảnh. Xem [R2](docs/qa/2026-11-11-task-R2.md) và [H](docs/qa/2026-11-11-acceptance.md).

**8. Backup/restore.** Cần Linux, Bash/coreutils, Docker/Compose; Node và tar chạy trong image app, không cần Node/MySQL CLI trên host. Chọn nơi lưu riêng ngoài repo:

```bash
bash deploy/backup.sh /private/harmea-backups
bash deploy/restore.sh /private/harmea-backups/<snapshot> --yes
```

Backup dừng app trong lúc dump DB và tar local, rồi trả về trạng thái chạy ban đầu. Snapshot có SHA256SUMS, manifest và dấu INCOMPLETE cho bản chưa xong. Restore kiểm tra hash, archive, driver/bucket/database và fingerprint LOOKUP_SECRET **trước khi dừng app**; sau đó thay DB/files, migrate và chờ ready. Lỗi sau khi bắt đầu restore giữ app dừng; chẩn đoán riêng có quyền hạn chế. S3 chỉ backup/restore DB, không gọi AWS; ảnh do cơ chế backup/versioning của bucket bảo vệ. Nơi lưu/lịch chạy do người vận hành quyết định; snapshot chứa dữ liệu riêng tư. Có thể đặt `HARMEA_STACK_DIR`, `HARMEA_COMPOSE_PROJECT`, `HARMEA_COMPOSE_OVERRIDE` khi stack dùng thư mục/project/override khác.

**9. Domain.** Giữ APP_URL đúng origin public; Origin browser không khớp bị 403 và robots/sitemap sẽ sai domain nếu cấu hình sai. App không có cookie phiên.

**10. Tài nguyên.** Image `v1` inspect: 413.396.711 byte. Ba mẫu `docker stats --no-stream` trước/sau 10/sau 20 đơn trên Docker Desktop WSL2 (32 CPU, RAM Docker 15,51 GiB, MySQL buffer pool 128M): app 39,94–67,82 MiB, CPU 0,01–0,03%; MySQL 451–451,6 MiB, CPU 0,42–4,58%. Đây là mẫu tức thời giữa các lượt, không phải đỉnh CPU/RAM hay tải đồng thời, không đại diện EC2. 20 request tạo đơn tuần tự đều 201, 85–122 ms; pool còn 1 kết nối sleep trước và sau (observer thêm 1 query). Chưa chứng minh không rò bộ nhớ khi chạy lâu. Bằng chứng JSON trong báo cáo H.

**11. Sau khi chạy.** Kiểm tra public `/health` 200 và `/ready` 200; admin tắt trả 404 hoặc được proxy bảo vệ khi bật; DB không có port public; `.env` riêng quyền 600 và secret đã sinh ngẫu nhiên. Diễn tập backup → xóa dữ liệu stack thử riêng → restore → đơn/ảnh còn nguyên trước bàn giao.

**12. S3 tùy chọn.** Người vận hành cung cấp bucket private/Block Public Access/SSE-S3, IAM role dùng được từ container (app chạy trong Docker nên instance cần IMDSv2 hop limit ít nhất 2; nếu là 1 thì app không lấy được credentials và `/ready` trả 503), quyền đọc/ghi/xóa `uploads/` và ListBucket cho việc phân biệt 404. Đây là điều kiện dịch vụ ứng dụng cần, không phải hướng dẫn tạo AWS. `/ready` phát sinh PUT/DELETE mỗi lần probe; chi phí chưa đo. Để chuyển ảnh: dừng app, cấu hình bucket/region trong env nhưng giữ driver local; chạy `docker compose run --rm --no-deps app node scripts/migrate-uploads-to-s3.mjs --dry-run` rồi lệnh thật, đối chiếu checksum, sau đó mới đổi `STORAGE_DRIVER=s3` và bật app. Giữ bản local cho tới khi xác nhận xong; script không xóa nguồn.

Release [43024206582](https://github.com/minh39707/harmea-mvp/actions/runs/43024206582) đã qua toàn bộ test, MinIO, Docker smoke và backup → xóa volumes project tạm → restore → đối chiếu đơn/hash ảnh trên đúng image trước push. Local H đã pull đúng digest, migrate 001–006, kiểm tra health/admin gate, SIGTERM và down/up giữ dữ liệu. Backup/restore Bash đã nghiệm thu qua CI Linux; chưa chạy lại Bash backup trên Windows/Ubuntu local (WSL chưa bật Docker integration). **Chưa có lệnh nào chạy trên server người vận hành.** Báo cáo G1–G3 giữ kết quả lịch sử; [H](docs/qa/2026-11-11-acceptance.md) ghi kết quả mới.
