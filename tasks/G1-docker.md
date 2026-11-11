# G1 — Đóng gói Docker cho production

**Trạng thái:** chưa làm. **Ước lượng:** 3–4 giờ. **Phụ thuộc:** F2 (có thể làm sớm, nhưng phải chạy lại kiểm tra sau F7).

## Mục tiêu

Một lệnh `docker compose -f compose.prod.yaml up -d` chạy toàn bộ website có HTTPS trên một máy Linux: Caddy (reverse proxy, TLS tự động) → app (Express phục vụ web build và API) → MySQL. Dữ liệu DB và upload nằm trên volume.

## Phạm vi file

`Dockerfile`, `.dockerignore`, `compose.prod.yaml`, `deploy/Caddyfile`, `deploy/.env.prod.example`, `apps/api/src/server.ts` (graceful shutdown, đọc config), `apps/api/src/app.ts` (`/api/ready`, `trust proxy`), `scripts/migrate.ts` (chạy được trong container), README, docs/02.

## Thiết kế bắt buộc

### Dockerfile (multi-stage)
- Stage `build` từ `node:24-bookworm-slim`: copy `package*.json` và các `apps/*/package.json` trước, chạy `npm ci` (tận dụng cache layer), copy source, rồi `npm run build`.
- Stage `runtime` từ `node:24-bookworm-slim` (glibc cho `sharp`): `npm ci --omit=dev` (hoặc prune), chỉ copy `apps/api/dist` (hoặc source `.ts` nếu dự án chạy bằng type stripping của Node, cần thống nhất với `start:api`), `apps/web/dist`, `database/`, `scripts/` cần cho migrate và create-admin.
- Chạy bằng user `node` (không phải root). `WORKDIR /app`. `ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000`. `HEALTHCHECK` gọi `/api/health` bằng `node -e` (image slim không có curl).
- Thư mục `/app/storage` thuộc user `node`, dùng làm volume.
- Image không chứa `.env`, `storage/`, `.local-admin.txt`, test hay docs. Kiểm tra bằng `docker run --rm <image> ls -la /app`.
- Kích thước image mục tiêu dưới 400 MB, ghi kích thước thực tế vào báo cáo.

### compose.prod.yaml
- `db`: `mysql:8.4`, volume `mysql_data`, **không publish port**, healthcheck, `restart: unless-stopped`, đặt giới hạn bộ nhớ hợp lý (ví dụ `innodb_buffer_pool_size=256M` cho máy 2 GB RAM, chỉnh được qua env).
- Thiết kế compose để người vận hành **bỏ được** service `caddy` (khi họ tự lo TLS) hoặc `db` (khi dùng MySQL bên ngoài) mà không phải sửa service `app`. Ví dụ: tách thành `compose.prod.yaml` (chỉ app) cùng `compose.proxy.yaml` và `compose.db.yaml`, hoặc dùng profiles. Chọn một cách rồi ghi vào README.
- `app`: build từ Dockerfile hoặc `image: ${APP_IMAGE}`, `env_file: .env.prod`, `depends_on: db (service_healthy)`, volume `uploads:/app/storage`, chỉ `expose: 4000`.
- `migrate`: profile `tools`, cùng image, chạy `node scripts/migrate.ts` rồi thoát. Dùng bằng `docker compose --profile tools run --rm migrate`. Thêm tương tự cho `create-admin`.
- `caddy`: `caddy:2`, publish `80` và `443`, volume `caddy_data` và `caddy_config`, mount `deploy/Caddyfile`. Caddyfile: `{$DOMAIN} { encode gzip zstd; reverse_proxy app:4000 }` cùng các header bảo mật chưa có trong `security-headers.ts` (HSTS chỉ bật khi đã có HTTPS).
- Network nội bộ; chỉ caddy ra ngoài.

### Ứng dụng
- `app.set('trust proxy', 1)` để `req.ip` và rate limit đúng khi chạy sau Caddy. Kiểm tra `api-guard` so Origin với `APP_ORIGIN=https://<domain>`.
- Cookie `Secure` tự bật khi `APP_ORIGIN` là https (đã có từ F3, kiểm tra lại).
- `/api/ready` ping DB (`SELECT 1`) và kiểm tra quyền ghi thư mục upload. `/api/health` giữ nguyên.
- Xử lý SIGTERM: ngừng nhận request, chờ request đang chạy (tối đa 10 giây), dừng outbox worker, đóng pool.
- Log ra stdout dạng một dòng JSON (method, path đã bỏ query, status, duration). **Không** log body, cookie, token hay fragment.
- Giới hạn upload trong Caddy (`request_body max_size 20MB`) khớp với giới hạn 16 MiB của app.

### deploy/.env.prod.example
Liệt kê đủ biến: `DOMAIN`, `APP_ORIGIN`, `DATABASE_URL`, `MYSQL_*`, `UPLOAD_DIR`, `MAIL_*`, `SMTP_*`, `PAYMENT_*` (nếu có F8). Mọi giá trị là placeholder.

## Hoàn thành khi

1. `docker build` thành công. `docker compose -f compose.prod.yaml up -d` trên máy local với `DOMAIN=localhost` (Caddy tự cấp chứng chỉ nội bộ) và `--profile tools run --rm migrate` chạy được.
2. Truy cập `https://localhost`: đặt đơn, đăng nhập admin và xem ảnh được. Restart toàn bộ stack (`down` rồi `up`, **không** dùng `-v`) vẫn còn dữ liệu.
3. Từ host không kết nối được MySQL (port không publish).
4. Image không chứa file bí mật (ghi lại output kiểm tra). Container chạy bằng user `node`.
5. README có mục "Chạy production bằng Docker". Báo cáo ghi kích thước image và những gì chưa thử (ví dụ chứng chỉ Let's Encrypt thật cần domain thật).

## Prompt giao việc

```text
Thực hiện task G1 trong tasks/G1-docker.md. Đọc tasks/00-ROADMAP-v2.md, AGENTS.md, README.md, docs/02, package.json gốc và apps/*/package.json, apps/api/src/server.ts và app.ts, scripts/migrate.ts.

Viết Dockerfile multi-stage chạy bằng user không phải root, .dockerignore, compose.prod.yaml (caddy + app + mysql, migrate/create-admin dạng profile tools), Caddyfile, .env.prod.example. Thêm trust proxy, /api/ready, graceful shutdown và log JSON không chứa dữ liệu nhạy cảm. MySQL không publish port. Không đưa bí mật vào image. Không deploy lên server hay cloud; phần đó do người vận hành làm.

Build và chạy thử stack trên máy với DOMAIN=localhost, kiểm tra luồng chính, restart giữ dữ liệu và nội dung image. Chạy typecheck, build và mọi test. Cập nhật README và docs/02. Viết báo cáo docs/qa/<ngày>-task-G1.md, commit trên nhánh feat/G1-docker. Không push.
```
