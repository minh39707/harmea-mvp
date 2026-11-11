# G3 — DEPLOY.md và gói bàn giao cho người vận hành server

**Trạng thái:** đã triển khai tài liệu, sinh env và backup/restore; chưa diễn tập Docker/server do Engine chưa chạy. **Ước lượng:** 2–2,5 giờ. **Phụ thuộc:** G2. Báo cáo: [G3](../docs/qa/2026-11-11-task-G3.md).

**Áp dụng AGENTS.md hiện hành:** không thêm Caddyfile, ví dụ cấu hình proxy hoặc runbook/script hạ tầng AWS. Các yêu cầu cũ bên dưới về snippet Caddy, chi tiết IMDS/hạ tầng và giá AWS được thay bằng điều kiện dịch vụ mà người vận hành cung cấp. Chưa có digest/số đo H thì ghi chưa nghiệm thu, không điền giá trị giả.

**Bổ sung sau review G1b ngày 11/11/2026:** app hỗ trợ `STORAGE_DRIVER=local|s3`. DEPLOY.md, `make-prod-env` và backup/restore phải xử lý cả hai chế độ, xem mục 12 và phần backup bên dưới. Mặc định vẫn là `local`.

## Phân công

Phía dự án giao: **image trên Docker Hub (tag version)**, `docker-compose.yml`, `.env.example`, `DEPLOY.md`, và **file `.env` thật gửi riêng**. Người vận hành lo: EC2, Caddy, network `web`, DNS `harmea.introd.xyz`, lưu trữ backup, giám sát. Agent **không** viết cấu hình hạ tầng và không thao tác lên server.

## Phạm vi file

`DEPLOY.md` (thư mục gốc, **ngắn gọn**), `scripts/make-prod-env.mjs` (mới), `deploy/backup.sh`, `deploy/restore.sh`, `CHANGELOG.md` (từ G2), README (link).

## Nội dung `DEPLOY.md` (tối đa khoảng 1–2 trang)

1. **Image:** `<dockerhub-user>/harmea-web:<version>` (ví dụ `:v1`), nền tảng `linux/amd64`. Ghi digest của bản đã nghiệm thu (lấy từ H).
2. **Cổng bên trong container:** `3000`. Container name/service `app`, gắn network external `web`. Caddy proxy tới `app:3000`. **Không publish cổng.**
3. **Health check:** `GET /health` (sống, không cần DB) và `GET /ready` (DB và thư mục upload sẵn sàng).
4. **Biến môi trường bắt buộc:** bảng gồm tên, ý nghĩa, ví dụ và có phải bí mật không. Tối thiểu: `NODE_ENV`, `PORT`, `APP_URL=https://harmea.introd.xyz`, `DATABASE_URL`, `MYSQL_*`, `UPLOAD_DIR`. Thêm `LOOKUP_SECRET` (bắt buộc, bí mật), `ADMIN_ENABLED`, `PHOTO_*`, `PAYMENT_*` (nếu có R5), `STORAGE_DRIVER` (mặc định `local`), `S3_BUCKET` và `AWS_REGION` (bắt buộc khi `STORAGE_DRIVER=s3`). Ghi rõ: **không** đặt `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_SESSION_TOKEN` hoặc endpoint tùy chỉnh, vì app sẽ từ chối khởi động. Ghi biến nào tùy chọn và giá trị mặc định.
5. **Lần đầu chạy:**
   ```bash
   docker compose pull
   docker compose up -d db
   docker compose run --rm app node scripts/migrate.ts
   docker compose up -d app
   docker compose run --rm app node scripts/backfill-lookup.mjs   # an toàn khi chạy lại; chỉ cần khi nâng cấp từ DB cũ
   ```
   **Admin (không có đăng nhập trong app):** mặc định tắt. Để bật: (1) người vận hành chặn `/admin*` và `/api/admin*` ở Caddy bằng `basic_auth` hoặc giới hạn IP; (2) đặt `ADMIN_ENABLED=true` trong `.env`; (3) `docker compose up -d app`. DEPLOY.md đưa đoạn Caddyfile **mẫu** để người vận hành tham khảo, ghi rõ là ví dụ, không phải file dự án quản lý. Cảnh báo: bật admin mà không chặn ở proxy thì SĐT, địa chỉ và ảnh của khách sẽ lộ công khai.
6. **Cập nhật phiên bản:** backup → đổi `APP_IMAGE` sang tag mới → `pull` → nếu CHANGELOG ghi có migration thì chạy migrate → `up -d app` → kiểm tra `/ready`. **Migration không tự rollback**: chỉ quay về tag cũ an toàn khi bản mới không có migration, còn không thì phải restore backup.
7. **Dữ liệu cần giữ (volume):** `mysql_data` (DB) và `uploads` (`/app/storage`: ảnh gốc đã nén và PNG preview của từng dòng đơn). Ghi dung lượng trung bình mỗi đơn (lấy từ số đo của báo cáo R2). Backup DB và uploads phải cùng một thời điểm.
8. **Backup/restore:** cách dùng `deploy/backup.sh <thư-mục>` và `deploy/restore.sh <thư-mục> --yes`. Nơi lưu trữ và lịch chạy do người vận hành quyết định.
9. **Domain:** `APP_URL` phải đúng `https://harmea.introd.xyz`. Nếu sai thì mọi request ghi (đặt đơn, tra cứu) bị chặn 403 do kiểm tra Origin, và robots/sitemap sai domain. App không dùng cookie.
10. **Tài nguyên:** RAM và CPU thực tế đo bằng `docker stats` lúc chạy kịch bản H. `MYSQL_BUFFER_POOL` mặc định `1G` cho máy 8 GB.
11. **Checklist sau khi chạy:** `https://harmea.introd.xyz/health` trả 200; nếu đã bật admin thì `/admin` phải hỏi mật khẩu của Caddy (hoặc bị chặn theo IP), còn nếu chưa bật thì trả 404; `db` không có port public; `.env` có quyền 600; `LOOKUP_SECRET` đã sinh ngẫu nhiên; chạy thử backup và restore một lần. Nếu dùng S3: `/ready` trả 200 (chứng tỏ container lấy được credentials từ role và ghi/xóa được object).
12. **(Tùy chọn) Lưu ảnh trên S3.** Viết dạng danh sách việc **người vận hành** tự làm; agent không viết policy JSON, Terraform hay lệnh AWS CLI:
    - Bucket private, bật Block Public Access, mã hóa mặc định SSE-S3. Nên bật versioning (để có bản cũ khi lỡ xóa).
    - IAM role gắn vào EC2 (instance profile) có quyền `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` trên `arn:aws:s3:::<bucket>/uploads/*`, và `s3:ListBucket` trên bucket (để object thiếu trả 404 thay vì 403, cần cho script chuyển ảnh).
    - **IMDSv2 hop limit phải là 2** trên instance (`HttpPutResponseHopLimit=2`). App chạy trong container nên cần thêm một hop để lấy credentials từ metadata; nếu là 1 thì driver S3 không có credentials và `/ready` trả 503. AMI Amazon Linux 2023 thường đặt sẵn 2, nhưng người vận hành phải tự kiểm tra.
    - Container app cần ra Internet tới S3 qua network `web` (network `backend` là internal).
    - Chi phí: `/ready` ghi rồi xóa một object thử mỗi lần healthcheck (30 giây), khoảng 175 nghìn request mỗi tháng, chưa tới 1 USD; có thể xuất hiện trong CloudTrail data events nếu bật.
    - Chuyển từ local sang S3: dừng nhận đơn (hoặc `docker compose stop app`), chạy `docker compose run --rm app node scripts/migrate-uploads-to-s3.mjs --dry-run`, rồi chạy thật; đối chiếu kết quả; sau đó mới đặt `STORAGE_DRIVER=s3`, `S3_BUCKET`, `AWS_REGION` và `up -d app`. Script không xóa file nguồn; giữ volume `uploads` cho tới khi đã kiểm tra xong.

## `scripts/make-prod-env.mjs` — sinh file `.env` thật để gửi riêng

- `npm run env:prod -- --out <đường-dẫn-ngoài-repo>`: sinh `.env` production từ `.env.example`. Các mật khẩu (`MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, …) sinh ngẫu nhiên bằng `crypto.randomBytes`; `DATABASE_URL` tạo khớp với mật khẩu; `APP_URL=https://harmea.introd.xyz`.
- **Từ chối ghi vào bên trong thư mục repo** (tránh lỡ commit). Ghi với quyền 600 nếu hệ điều hành hỗ trợ. Không in giá trị bí mật ra console. Không ghi đè file đã có (trừ khi có `--force`).
- Có test: file sinh ra đủ biến của `.env.example`, không còn `CHANGE_ME`, `DATABASE_URL` khớp mật khẩu, từ chối đường dẫn trong repo.
- Trong DEPLOY.md: file này **gửi riêng** cho người phụ trách server qua kênh an toàn, không đưa lên GitHub hay chat công khai.

## Script `deploy/backup.sh` và `deploy/restore.sh`

- `backup.sh <thư-mục-đích>`: `docker compose exec -T db mysqldump --single-transaction --routines` (mật khẩu truyền qua biến môi trường hoặc file option, không đặt trên command line), cộng `tar` volume `uploads` qua một container tạm. Tạo thư mục có timestamp kèm file `SHA256SUMS`. Không upload đi đâu.
- `restore.sh <thư-mục> --yes`: kiểm tra checksum, dừng `app`, restore DB và uploads, chạy migrate, khởi động lại `app`, chờ `/ready`.
- Đọc `STORAGE_DRIVER` từ `.env`. Khi là `s3`: chỉ backup/restore DB, bỏ qua tar volume `uploads`, in một dòng nhắc ảnh nằm trên S3 và được bảo vệ bằng versioning/backup của bucket do người vận hành quản lý. Script không gọi AWS.
- `make-prod-env.mjs` mặc định sinh `STORAGE_DRIVER=local`; có tùy chọn `--s3-bucket <tên> --aws-region <vùng>` để sinh cấu hình S3. Không bao giờ sinh biến access key AWS.
- `set -euo pipefail`, không in secret, `shellcheck` sạch nếu cài được. Chạy được trên Amazon Linux 2023 (bash, coreutils; không giả định có lệnh ngoài Docker).

## Hoàn thành khi

1. DEPLOY.md đủ 12 mục, ngắn gọn, mọi lệnh trong đó đã chạy thử trên stack local (hoặc trong CI nếu máy không có Docker). Ghi rõ lệnh nào đã chạy và chạy ở đâu.
2. Đã diễn tập backup → xóa dữ liệu stack thử → restore → đơn và ảnh còn nguyên (nếu có Docker; nếu không có thì ghi chưa chạy).
3. Test `make-prod-env` qua. Kiểm tra `git status` sau khi chạy không xuất hiện file `.env` mới trong repo.
4. Báo cáo `docs/qa/<ngày>-task-G3.md` ghi rõ: **chưa chạy trên server của người vận hành**, và liệt kê những thứ người dùng phải tự gửi (tag image, file `.env` thật).

## Prompt giao việc

```text
Thực hiện task G3 trong tasks/09-G3-deploy-handoff.md. Đọc tasks/00-ROADMAP.md, AGENTS.md, Dockerfile, docker-compose.yml, .env.example, .github/workflows/*, CHANGELOG.md và báo cáo G1/G2/R1/R2.

Viết DEPLOY.md ngắn ở thư mục gốc: image và tag, cổng 3000, network web, health /health và /ready, bảng biến môi trường bắt buộc, lệnh migrate lần đầu, cách bật admin an toàn (gate + chặn ở Caddy, kèm đoạn Caddyfile mẫu), quy trình cập nhật và rollback, volume cần giữ, backup/restore, domain harmea.introd.xyz, tài nguyên đo thực tế, checklist, và mục tùy chọn S3 (danh sách việc của người vận hành: bucket private, IAM role với quyền trên prefix uploads/, IMDSv2 hop limit 2, quy trình chuyển ảnh bằng migrate-uploads-to-s3.mjs). Viết scripts/make-prod-env.mjs sinh .env production có mật khẩu ngẫu nhiên, mặc định STORAGE_DRIVER=local, có tùy chọn S3, chỉ ghi ra ngoài repo, không in secret, có test. Viết deploy/backup.sh và restore.sh ở mức ứng dụng, xử lý cả STORAGE_DRIVER=local và s3 (s3 thì chỉ backup DB). Không viết cấu hình Caddy hay hạ tầng, không thao tác lên server.

Chạy thử lệnh trên stack local nếu có Docker, nếu không có thì ghi rõ. Viết báo cáo docs/qa/<ngày>-task-G3.md. Không commit, không tạo nhánh, không push: để thay đổi trong working tree cho Claude kiểm tra.
```
