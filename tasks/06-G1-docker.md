# G1 — Đóng gói Docker theo yêu cầu của người vận hành server

**Trạng thái:** Đã triển khai code/config và kiểm tra Node; Docker Engine chưa chạy nên chưa nghiệm thu build/runtime. **Ước lượng:** 3–4 giờ. **Phụ thuộc:** R1 (chạy lại kiểm tra sau R4).

## Hạ tầng phía server (đã có sẵn, KHÔNG làm)

- AWS EC2 t3.large (2 vCPU, 8 GB RAM), **linux/amd64**, Amazon Linux 2023, Docker 25.
- Domain: **https://harmea.introd.xyz**. HTTPS do **Caddy** chạy trong container riêng của người vận hành lo. Caddy gọi vào app qua Docker network **`web`** (external) bằng địa chỉ **`app:3000`**.
- App **không** xử lý HTTPS, **không** publish cổng ra ngoài máy. Dự án **không** cung cấp Caddyfile hay cấu hình proxy.

## Mục tiêu

Một image `linux/amd64` chạy được bằng cả hai cách nghiệm thu dưới đây, trả `200` tại `http://localhost:3000/health`:

```bash
docker build --platform linux/amd64 -t harmea-web:test .
docker run --rm -p 3000:3000 --env-file .env harmea-web:test
# hoặc
docker network create web   # chỉ cần một lần trên máy local
docker compose up --build
```

## Phạm vi file

`Dockerfile`, `.dockerignore`, `docker-compose.yml` (mới, production), đổi tên `compose.yaml` → `compose.dev.yaml`, `.env.example`, `.gitignore` (kiểm tra), `apps/api/src/server.ts`, `apps/api/src/app.ts`, `apps/api/src/middleware/api-guard.ts`, `apps/web/vite.config.ts`, `scripts/setup.mjs`, `package.json` (script dev DB), tests có dùng `APP_ORIGIN`, README, docs/02.

## Thay đổi bắt buộc trong ứng dụng

### Cổng, host, URL
- `server.ts`: `PORT` mặc định **3000**, `HOST` mặc định **`0.0.0.0`**. Bỏ `HOST` khỏi `.env.example` và khỏi file `setup` sinh ra, để `docker run --env-file .env` không bao giờ bị bind vào loopback. Dev muốn chỉ nghe trên loopback thì tự thêm `HOST=127.0.0.1`; ghi chú điều này trong README.
- `vite.config.ts`: proxy `/api` tới `http://127.0.0.1:${API_PORT ?? 3000}`. Dev vẫn dùng Vite ở 5173.
- **Đổi `APP_ORIGIN` → `APP_URL`** ở mọi nơi (api-guard, robots/sitemap của R4, link tuyệt đối). Vẫn đọc `APP_ORIGIN` làm giá trị dự phòng và log cảnh báo một lần (không log giá trị). Production: `APP_URL=https://harmea.introd.xyz`.
- `api-guard`: khi `NODE_ENV=production`, danh sách Origin hợp lệ **chỉ** gồm origin của `APP_URL`. Các origin `localhost`/`127.0.0.1` hard-code chỉ dùng ngoài production.

### Sau reverse proxy
- `app.set('trust proxy', 1)` (Caddy là một hop). Test: request có `X-Forwarded-For: 203.0.113.9` và `X-Forwarded-Proto: https` thì `req.ip` và `req.secure` đúng; rate limit tính theo IP client, không theo IP của Caddy.
- **App không dùng cookie hay session** (không có đăng nhập, xem D2). Nếu sau này cần cookie thì phải `Secure` và host-only. Test: không response nào có header `Set-Cookie`.
- **Admin gate (R1):** compose production **không** đặt `ADMIN_ENABLED`, nên admin mặc định tắt. DEPLOY.md hướng dẫn người vận hành bật sau khi đã chặn `/admin*` và `/api/admin*` ở Caddy.

### Health check
- Thêm **`GET /health`** (ngoài `/api` nên không bị api-guard và rate limit chặn) trả `200 {"status":"ok"}`. **Không phụ thuộc DB**, để `docker run` không có MySQL vẫn qua tiêu chí nghiệm thu. Giữ `/api/health`.
- Thêm `GET /ready`: ping DB (`SELECT 1`) và kiểm tra quyền ghi `UPLOAD_DIR`. Trả `200` hoặc `503`, dùng cho healthcheck trong compose.
- **App phải khởi động được kể cả khi DB chưa sẵn sàng**: không crash lúc boot, mọi job nền (nếu có) bắt lỗi kết nối và thử lại sau; request cần DB thì trả 503 thay vì làm crash tiến trình.

### Tắt êm và log
- `SIGTERM`/`SIGINT`: ngừng nhận kết nối mới, chờ request đang chạy (tối đa 10 giây), dừng job nền, đóng pool, rồi `exit(0)`. Có test: gửi SIGTERM cho tiến trình con, tiến trình thoát với mã 0 trong thời gian giới hạn.
- Log một dòng JSON ra **stdout** (method, path bỏ query, status, duration_ms); lỗi ra stderr. Không ghi file log trong container. **Không** log body, mã đơn kèm SĐT, SĐT, địa chỉ hay URL nhạc.

## Dockerfile (multi-stage)

- Base: `node:24.x-bookworm-slim` với **version cụ thể** (ví dụ `node:24.11.1-bookworm-slim`, agent chọn bản 24 mới nhất đã phát hành ít nhất 2 tuần và ghi lý do). Dùng slim (glibc) để `sharp` dùng được binary prebuilt `linux-x64`. Không dùng alpine.
- Stage `build`: copy `package*.json` và `apps/*/package.json` trước, `npm ci`, copy source, `npm run build`, rồi `npm prune --omit=dev`.
- Stage `runtime`: chỉ copy `node_modules` đã prune, `apps/api/dist`, `apps/web/dist`, `database/` và các script cần cho migrate, backfill (R1) và seed (cùng file `.ts` chúng import nếu chạy bằng type stripping của Node 24; agent kiểm tra và ghi rõ).
- `ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 UPLOAD_DIR=/app/storage/uploads`.
- `RUN mkdir -p /app/storage && chown node:node /app/storage`, rồi `USER node`. Khai báo `VOLUME /app/storage`.
- `EXPOSE 3000`.
- `HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node","-e","fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]`.
- `CMD ["node","apps/api/dist/server.js"]` (exec form, để node nhận SIGTERM trực tiếp).
- Image không chứa `.env*`, `.local-admin.txt`, `storage/`, `.git`, tests, docs, `tasks/`. Ghi kích thước image thực tế vào báo cáo.

## `.dockerignore`

`.env`, `.env.*` (trừ `.env.example`), `.local-admin.txt`, `node_modules`, `**/node_modules`, `.npm-cache`, `.git`, `dist`, `**/dist`, `storage`, `coverage`, `*.log`, `docs`, `tasks`, `tests`, `.github`, `.vscode`, `*.tap`.

**Lý do bắt buộc loại `node_modules`:** máy dev là Windows, `sharp` trong `node_modules` local là binary Windows và sẽ hỏng trong container Linux.

## `docker-compose.yml` (production, ở thư mục gốc)

```yaml
services:
  app:
    image: ${APP_IMAGE:-harmea-web:local}
    build: { context: ., platform: linux/amd64 }
    container_name: app
    env_file: .env
    restart: unless-stopped
    depends_on:
      db: { condition: service_healthy }
    volumes: [ "uploads:/app/storage" ]
    networks: [ web, backend ]
    # KHÔNG có "ports:" — Caddy gọi app:3000 qua network web
  db:
    image: mysql:8.4.x   # version cụ thể
    env_file: .env       # MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD
    restart: unless-stopped
    command: ["--innodb-buffer-pool-size=${MYSQL_BUFFER_POOL:-1G}", "--character-set-server=utf8mb4", "--collation-server=utf8mb4_0900_ai_ci", "--default-time-zone=+00:00"]
    volumes: [ "mysql_data:/var/lib/mysql" ]
    healthcheck: { test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1", "-u", "root", "-p$$MYSQL_ROOT_PASSWORD"], interval: 5s, retries: 20 }
    networks: [ backend ]
    # KHÔNG có "ports:"
networks:
  web: { external: true }
  backend: { internal: true }
volumes: { uploads: {}, mysql_data: {} }
```

- Bản trên là khung; agent hoàn thiện cho đúng cú pháp và kiểm tra bằng `docker compose config`. Tránh để mật khẩu root lộ trong `docker inspect` của healthcheck nếu có cách tốt hơn (ví dụ `MYSQL_PWD` qua env, hoặc kiểm tra bằng user app).
- `db` chỉ nằm trong network `backend` (internal), nên Caddy và Internet không với tới được.
- `DATABASE_URL` trong `.env` dùng host `db`: `mysql://harmea:<pw>@db:3306/harmea`.
- Migrate bằng lệnh một lần: `docker compose run --rm app node scripts/migrate.ts`. Agent xác nhận đúng đường dẫn và lệnh chạy được trong image. Không có bước tạo admin.
- **Đổi tên `compose.yaml` hiện tại (MySQL cho dev) thành `compose.dev.yaml`.** Cập nhật script `npm run db:up` = `docker compose -f compose.dev.yaml up -d --wait db`, cùng README và docs. Lý do: Compose ưu tiên `compose.yaml` hơn `docker-compose.yml`; nếu giữ tên cũ thì `docker compose up --build` sẽ chạy nhầm file dev.

## `.env.example` (mẫu cho container/production)

Liệt kê đủ, mỗi biến có chú thích, ghi rõ bắt buộc/tùy chọn và có phải bí mật không. Giá trị bí mật để placeholder.
- `NODE_ENV=production`, `PORT=3000`, `APP_URL=https://harmea.introd.xyz`
- `DATABASE_URL=mysql://harmea:CHANGE_ME@db:3306/harmea`, `DB_CONNECTION_LIMIT=10`
- `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `MYSQL_BUFFER_POOL=1G`
- `UPLOAD_DIR=/app/storage/uploads`
- `LOOKUP_SECRET` (bí mật, bắt buộc, R1), `ADMIN_ENABLED` (tùy chọn, mặc định false ở production, R1), `PHOTO_MAX_EDGE`, `PHOTO_JPEG_QUALITY` (R2), `PAYMENT_*` (R5, nếu làm).
- Dev local dùng **chung file `.env`** (do `npm run setup` sinh). `setup` sinh giá trị dev (`APP_URL=http://localhost:5173`, `DATABASE_URL` trỏ `127.0.0.1`, `NODE_ENV` để trống). File này không có `HOST`, nên vẫn dùng được cho lệnh `docker run` nghiệm thu `/health`.
- `.gitignore` đã có `.env` và `.env.*` (kiểm tra lại và giữ nguyên).

## Hoàn thành khi

1. `docker build --platform linux/amd64 -t harmea-web:test .` thành công. `docker image inspect` cho thấy `Architecture: amd64` và `User: node`.
2. `docker run --rm -p 3000:3000 --env-file .env harmea-web:test`: `curl -i http://localhost:3000/health` trả **200**, kể cả khi không có MySQL.
3. `docker network create web` (local), `docker compose up --build`, chạy migrate, đặt `ADMIN_ENABLED=true` trong `.env` local: đặt đơn, tra cứu bằng mã đơn + SĐT, mở admin, xem ảnh qua `http://localhost:3000` được. Muốn truy cập từ host thì tạm thêm một file override có `ports: ["3000:3000"]` (ví dụ `docker-compose.local.yml`, chỉ dùng local, ghi trong README). File chính không có ports.
4. `docker compose down` rồi `up` (**không** dùng `-v`) vẫn còn đơn và ảnh. `docker compose stop app` thoát êm (log không có lỗi, exit code 0).
5. Container không kết nối được ra `db` từ host; trong `docker compose config`, `db` không có `ports`.
6. Kiểm tra nội dung image (`docker run --rm --entrypoint sh harmea-web:test -c 'ls -la /app; id'`): không có file bí mật, chạy với uid của user `node`.
7. Mọi test cũ qua (sau khi đổi `APP_ORIGIN` → `APP_URL`), thêm test cho `/health`, `/ready`, trust proxy và SIGTERM.
8. **Điều kiện môi trường:** máy dev hiện chưa có WSL2/Docker engine (theo báo cáo F2). Nếu vẫn chưa có thì làm phần code và test Node, chạy `docker compose config` (nếu CLI có), rồi ghi rõ các mục 1–6 **chưa chạy**. Khi đó mục 1–2 sẽ được nghiệm thu trong CI ở G2. **Không** ghi PASS.

## Prompt giao việc

```text
Thực hiện task G1 trong tasks/06-G1-docker.md. Đọc tasks/00-ROADMAP.md, AGENTS.md, README.md, docs/02, package.json gốc và apps/*/package.json, apps/api/src/server.ts, app.ts, middleware/api-guard.ts, báo cáo R1, apps/web/vite.config.ts, scripts/setup.mjs, scripts/migrate.ts, compose.yaml và .env.example.

Đóng gói theo yêu cầu của người vận hành: image linux/amd64 multi-stage trên node bookworm-slim có version cụ thể, user node, PORT mặc định 3000, HOST mặc định 0.0.0.0, EXPOSE, HEALTHCHECK, CMD exec form; GET /health không phụ thuộc DB và /ready có kiểm DB; app khởi động được khi DB chưa sẵn sàng; tắt êm khi SIGTERM; log JSON ra stdout; trust proxy 1; đổi APP_ORIGIN thành APP_URL (có fallback); không có Set-Cookie; admin gate mặc định tắt ở production. docker-compose.yml gồm app (container_name app, network web external + backend internal, không ports, depends_on db service_healthy, volume uploads) và mysql 8.4 (volume, không ports). Đổi compose.yaml dev thành compose.dev.yaml. Viết .env.example đầy đủ có chú thích, .dockerignore. Không viết cấu hình Caddy, không publish cổng, không deploy.

Nếu máy có Docker thì chạy đủ tiêu chí nghiệm thu; nếu không có thì ghi rõ chưa chạy. Chạy typecheck, build, contract:check và mọi test. Cập nhật README và docs/02. Viết báo cáo docs/qa/<ngày>-task-G1.md. Không commit, không tạo nhánh, không push: để thay đổi trong working tree cho Claude kiểm tra.
```
