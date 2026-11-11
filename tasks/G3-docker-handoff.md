# G3 — Hồ sơ bàn giao Docker cho người vận hành server

**Trạng thái:** chưa làm. **Ước lượng:** 1,5–2 giờ. **Phụ thuộc:** G2.

## Phân công

Phía dự án giao **image Docker cùng tài liệu bàn giao**. Mọi thao tác trên AWS do **người vận hành** đảm nhận: tạo server, mạng/security group, DNS, chứng chỉ TLS, database được quản lý (nếu dùng), lưu trữ backup, giám sát. Agent **không** viết runbook AWS, không viết script hạ tầng và không thao tác lên tài khoản cloud.

## Phạm vi file

`docs/06-docker-handoff.md` (mới), `deploy/backup.sh` và `deploy/restore.sh` (chỉ chạy ở mức ứng dụng), README (link).

## Nội dung `docs/06-docker-handoff.md`

1. **Thành phần bàn giao:** tên image và tag trên registry (từ G2), `compose.prod.yaml`, `deploy/Caddyfile`, `deploy/.env.prod.example`. Nêu rõ cách build lại từ source (`docker build -t harmea:<version> .`) nếu người vận hành không lấy image từ registry.
2. **Yêu cầu chạy:** Linux x86_64 (hoặc arm64 nếu G2 có build multi-arch), Docker Engine kèm compose plugin. RAM và đĩa tối thiểu **đo được** khi chạy stack ở G1 (`docker stats`), không phỏng đoán.
3. **Bảng biến môi trường:** từng biến gồm ý nghĩa, bắt buộc hay không, giá trị ví dụ và biến nào là bí mật. Bao gồm `APP_ORIGIN` (phải là URL https công khai, vì ảnh hưởng tới kiểm tra Origin và cookie `Secure`), `DATABASE_URL`, `UPLOAD_DIR`, `MAIL_*`/`SMTP_*`, `PAYMENT_*` nếu có.
4. **Mạng và cổng:** app lắng nghe `4000/tcp` bên trong. Chỉ reverse proxy được ra Internet (80/443). MySQL **không** được mở ra ngoài. Yêu cầu với proxy: chuyển tiếp `X-Forwarded-For`/`X-Forwarded-Proto`, giới hạn body ≥ 20 MB, timeout ≥ 60 giây cho upload. App dùng `trust proxy` 1 tầng; nếu có nhiều tầng proxy (ví dụ load balancer + Caddy) thì ghi cách chỉnh.
5. **Các cách chạy được hỗ trợ:**
   - A: dùng nguyên `compose.prod.yaml` (Caddy + app + MySQL).
   - B: người vận hành tự lo TLS (load balancer): bỏ service `caddy`, publish app qua proxy của họ.
   - C: database bên ngoài (ví dụ MySQL được quản lý): bỏ service `db`, trỏ `DATABASE_URL` tới đó. Yêu cầu MySQL 8.4 tương thích, `utf8mb4`, time zone UTC, user có quyền DDL để chạy migration.
6. **Dữ liệu bền cần giữ:** volume MySQL (nếu chạy trong compose) và volume `/app/storage` (ảnh gốc/PNG của đơn, outbox email). Mất volume uploads thì admin không xem được thiết kế của đơn cũ. Ghi rõ: backup DB và uploads phải cùng một thời điểm.
7. **Quy trình lần đầu:** tạo `.env.prod` → `migrate` (profile tools) → `up -d` → chờ `/api/ready` → `create-admin` → đổi mật khẩu admin khi đăng nhập lần đầu.
8. **Cập nhật phiên bản:** backup → pull image mới → `migrate` → `up -d` → kiểm tra `/api/ready`. **Migration không tự rollback**, nên rollback image chỉ an toàn khi version đó không có migration mới; nếu có thì phải restore từ backup. Mỗi release ghi trong CHANGELOG hoặc release note là có migration hay không.
9. **Kiểm tra sức khỏe:** `/api/health` (tiến trình còn sống) và `/api/ready` (DB và thư mục upload sẵn sàng), dùng cho healthcheck của nền tảng. Log JSON ra stdout, không chứa dữ liệu nhạy cảm, nên thu bằng log driver nào cũng được.
10. **Backup/restore ở mức ứng dụng:** cách dùng `deploy/backup.sh` và `restore.sh` (bên dưới). Nơi lưu file backup và lịch chạy do người vận hành quyết định.
11. **Checklist cho người vận hành sau khi chạy:** HTTPS hoạt động, `/admin` yêu cầu đăng nhập, cổng DB không truy cập được từ ngoài, `.env.prod` không đọc được bởi user khác, `robots.txt` đúng, đã tạo admin và đổi mật khẩu, đã chạy thử backup và restore.
12. **Liên hệ và trách nhiệm:** bảng ai làm gì (dự án: image, migration, cấu hình ứng dụng; người vận hành: hạ tầng, TLS, DNS, backup storage, giám sát).

## Script `deploy/backup.sh` và `deploy/restore.sh`

- `backup.sh <thư-mục-đích>`: `mysqldump --single-transaction --routines` qua `docker compose exec` (hoặc qua `DATABASE_URL` nếu dùng DB ngoài), cùng `tar` volume uploads. Tạo một thư mục có timestamp kèm file checksum SHA-256. Không upload lên đâu cả.
- `restore.sh <thư-mục-backup>`: kiểm tra checksum, yêu cầu xác nhận (`--yes`), dừng app, restore DB và uploads, chạy `migrate`, khởi động lại.
- `set -euo pipefail`, không in mật khẩu (dùng file option của MySQL thay cho `-p` trên command line), `shellcheck` sạch nếu cài được.

## Hoàn thành khi

1. Có tài liệu đủ 12 mục. Mọi lệnh trong tài liệu đã được chạy thử trên stack local của G1, ghi kết quả vào báo cáo.
2. Đã diễn tập `backup.sh` → xóa dữ liệu stack thử → `restore.sh` → đơn và ảnh còn nguyên.
3. Diễn tập cách chạy C (DB ngoài) bằng một container MySQL riêng để chắc `DATABASE_URL` bên ngoài hoạt động.
4. Báo cáo `docs/qa/<ngày>-task-G3.md` ghi rõ: **chưa chạy trên server của người vận hành**.

## Prompt giao việc

```text
Thực hiện task G3 trong tasks/G3-docker-handoff.md. Đọc tasks/00-ROADMAP-v2.md, AGENTS.md, Dockerfile, compose.prod.yaml, deploy/*, .github/workflows/* và báo cáo G1/G2.

Viết docs/06-docker-handoff.md cho người vận hành server: thành phần bàn giao, yêu cầu chạy đo thực tế, bảng biến môi trường, cổng và yêu cầu proxy, ba cách chạy (đủ bộ / TLS ngoài / DB ngoài), dữ liệu bền, quy trình lần đầu và cập nhật, healthcheck, backup/restore, checklist, phân công trách nhiệm. Viết deploy/backup.sh và restore.sh ở mức ứng dụng, không gửi dữ liệu lên dịch vụ cloud. Không viết runbook hạ tầng AWS và không thao tác cloud.

Chạy thử mọi lệnh trên stack local, diễn tập backup/restore và cách chạy DB ngoài. Viết báo cáo docs/qa/<ngày>-task-G3.md, commit trên nhánh feat/G3-docker-handoff. Không push.
```
