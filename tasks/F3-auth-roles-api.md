# F3 — Users, roles và phân quyền (backend)

**Trạng thái:** chưa làm. **Ước lượng:** 4–6 giờ. **Phụ thuộc:** F2.

## Mục tiêu

Có bảng `users` với role `user`/`admin`, đăng ký/đăng nhập bằng email, session cookie chung cho cả hai role, middleware phân quyền, gắn đơn vào user khi đã đăng nhập, và API "đơn của tôi". Admin hiện tại (env) chuyển sang user có role `admin`.

## Phạm vi file

`database/00X_users.sql` (migration mới), `apps/api/src/modules/auth/` (module mới), `apps/api/src/modules/me/` (module mới), `apps/api/src/modules/admin/` (thay `session.ts`), `apps/api/src/modules/orders/` (gắn `user_id`, đổi guard), `apps/api/src/modules/index.ts`, `scripts/create-admin.mjs` (mới), `scripts/setup.mjs`, `.env.example`, contract, docs/03, `tests/auth.mjs` (mới), `tests/admin.mjs`. Frontend admin chỉ sửa tối thiểu để không hỏng (đổi URL login), phần UI thuộc F4.

## Thiết kế bắt buộc

### Dữ liệu (migration mới)
- `users`: `id CHAR(36)`, `email VARCHAR(254) UNIQUE` (đã lowercase và trim), `password_hash VARCHAR(200)`, `display_name VARCHAR(80)`, `phone VARCHAR(20) NULL`, `default_address JSON NULL`, `role ENUM('user','admin') NOT NULL DEFAULT 'user'`, `status ENUM('active','disabled') NOT NULL DEFAULT 'active'`, `created_at`, `updated_at`.
- `sessions`: `id`, `user_id` FK, `token_hash CHAR(64) UNIQUE`, `created_at`, `expires_at`, `last_seen_at`, index theo `user_id` và `expires_at`. Xóa bảng `admin_sessions`.
- `orders.user_id CHAR(36) NULL` FK → users, index `(user_id, created_at)`.
- Bảng hiện có `order_status_events`: thêm `actor_user_id NULL` để biết admin nào đổi trạng thái. Không tạo bảng `order_status_history` trùng chức năng.

### Mật khẩu và session
- Hash bằng scrypt (`node:crypto`), format `scrypt$N$r$p$salt$hash` để sau này đổi tham số được. So sánh bằng `timingSafeEqual`. Mật khẩu dài 8–128 ký tự.
- Token session là 32 byte ngẫu nhiên (base64url). DB chỉ lưu SHA-256. Cookie `harmea_session`: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` khi `APP_ORIGIN` là https.
- Thời hạn: user 30 ngày, admin 8 giờ (theo role tại thời điểm đăng nhập).
- Đăng nhập thì cấp token mới và xóa token cũ trong cookie (chống session fixation). Đổi mật khẩu thì xóa mọi session khác của user đó. Khi user bị `disabled`, mọi request kế tiếp bị từ chối.
- Rate limit đăng nhập theo cả IP và email (5 lần/phút) dựa trên middleware hiện có. Sai email hay sai mật khẩu đều trả cùng thông báo và cùng mã `INVALID_CREDENTIALS`. Luôn chạy scrypt kể cả khi email không tồn tại, để thời gian phản hồi không lộ thông tin.

### Middleware
- `loadSession` gắn `req.user = { id, role, email }` hoặc `null`. Một truy vấn JOIN `sessions`+`users`, chỉ lấy session còn hạn và user `active`.
- `requireAuth` trả 401 `UNAUTHENTICATED`. `requireRole('admin')` trả 403 `FORBIDDEN` cho user thường và 401 khi chưa đăng nhập.
- **Mọi** route `/api/admin/**` (kể cả tải ảnh) dùng `requireRole('admin')`. Viết test liệt kê tự động các route admin từ contract và gọi thử bằng user thường để chắc không route nào lọt.

### Endpoint (theo contract 0.3.0, đổi `x-status` thành implemented)
- `POST /api/auth/register` {email, password, displayName} → 201 + set cookie. Email trùng → 409 `EMAIL_TAKEN`. **Không** nhận trường `role` (nếu gửi lên thì bỏ qua và có test chứng minh).
- `POST/GET/DELETE /api/auth/session` (login/kiểm tra/logout). GET trả `User` + `expiresAt`.
- `GET /api/me`, `PATCH /api/me` (displayName, phone, defaultAddress dùng cùng validation người nhận của đơn). `PUT /api/me/password` {currentPassword, newPassword}.
- `GET /api/me/orders` (phân trang) và `GET /api/me/orders/{id}`: chỉ trả đơn có `user_id` của chính mình. Đơn của người khác trả **404** (không phải 403). Response dùng allowlist: được xem người nhận và thiết kế của chính mình, **không** có ghi chú nội bộ hay token hash.
- `POST /api/orders`: nếu có session hợp lệ thì gán `user_id`; khách không đăng nhập vẫn đặt được như cũ. Snapshot và giá giữ nguyên quy tắc.
- Gỡ `/api/admin/session` cũ và `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH`.

### Tạo admin
- `npm run user:create-admin -- --email <email>`: sinh mật khẩu ngẫu nhiên, ghi vào `.local-admin.txt` (đã gitignore), không in ra log. Nếu email đã tồn tại thì nâng role lên admin (có hỏi `--promote`). `setup.mjs` gọi lệnh này cho môi trường local.
- Không có endpoint public nào tạo được admin.

## Test bắt buộc (`tests/auth.mjs`, MySQL thật)

- Đăng ký → cookie → GET /me đúng. Đăng ký email trùng (khác hoa/thường) → 409.
- Đăng nhập sai → 401, quá 5 lần → 429. Logout xong cookie cũ bị từ chối.
- Session hết hạn (chỉnh `expires_at` trong DB) → 401. User bị disabled → 401.
- User thường gọi **mọi** route admin → 403. Chưa đăng nhập → 401.
- User A không đọc được đơn của user B (404). Khách đặt đơn → `user_id` NULL. User đăng nhập đặt đơn → xuất hiện trong /me/orders.
- Gửi `role: 'admin'` khi đăng ký vẫn ra role `user`.
- Đổi mật khẩu → các session khác bị hủy, session hiện tại vẫn dùng được.
- Admin đổi trạng thái → history ghi `actor_user_id`.
- Không có response nào chứa `password_hash` hay `token_hash` (quét JSON).

## Hoàn thành khi

1. Mọi test (cũ và mới) qua trên MySQL. Test admin cũ chuyển sang đăng nhập bằng admin user.
2. Contract khớp response (dùng validator schema đang có trong test).
3. `/admin/login` trên UI vẫn đăng nhập được bằng admin mới (có thể sửa tạm client admin).
4. Có báo cáo `docs/qa/<ngày>-task-F3.md`.

## Prompt giao việc

```text
Thực hiện task F3 trong tasks/F3-auth-roles-api.md. Đọc tasks/00-ROADMAP-v2.md, AGENTS.md, docs/01 (phạm vi v2), docs/03, contracts/openapi.json, apps/api/src/modules/admin/session.ts, orders/* và tests/admin.mjs.

Triển khai backend users/roles: migration mới (users, sessions, orders.user_id, actor_user_id), scrypt, cookie session chung có TTL theo role, loadSession/requireAuth/requireRole, các endpoint /api/auth/*, /api/me*, gắn user_id khi đặt đơn mà vẫn cho khách đặt không cần tài khoản, script create-admin, gỡ admin bằng env. Kiểm tra quyền ở server cho mọi route admin, kể cả route tải tệp. Không thêm thư viện auth bên ngoài.

Viết đủ các integration test bắt buộc trên MySQL thật. Cập nhật contract (đổi planned thành implemented cho phần đã làm), docs/03 và README. Chạy typecheck, build, contract:check và mọi test. Viết báo cáo docs/qa/<ngày>-task-F3.md, commit trên nhánh feat/F3-auth-roles. Không push.
```
