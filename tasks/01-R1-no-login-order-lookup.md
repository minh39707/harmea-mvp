# R1 — Gỡ tài khoản và đăng nhập; tra cứu đơn bằng mã đơn + SĐT; admin không login

**Trạng thái:** hoàn thành 11/11/2026. **Ước lượng:** 3–4 giờ. **Phụ thuộc:** F2.

## Bối cảnh

Người dùng quyết định **bỏ toàn bộ đăng nhập** (xem D2–D4 trong [roadmap](00-ROADMAP.md)). Working tree đang có code của F3/F4 đã hủy, phải gỡ sạch, nhưng **giữ nguyên F2 (MySQL) và các thay đổi giao diện storefront** đang có.

## Phần 1 — Gỡ code F3/F4 đã hủy

- Xóa: `apps/api/src/modules/auth/`, `apps/api/src/modules/me/`, `apps/web/src/features/account/`, `scripts/create-admin.mjs`, `tests/auth.mjs`, `tests/account.mjs`, `tests/helpers/users.mjs` (nếu chỉ phục vụ auth), `database/003_users.sql`.
- **Về việc xóa `003_users.sql`:** báo cáo F3/F4 ghi migration này **chưa** được áp vào DB local của người dùng, chỉ chạy trong DB test tạm. Trước khi xóa, agent **kiểm tra bảng `schema_migrations` của DB trong `.env`** (chỉ đọc, không in thông tin kết nối). Nếu `003_users.sql` **đã** được áp thì **không xóa**, mà viết migration mới để drop `users`, `sessions` và các cột liên quan, rồi ghi rõ trong báo cáo.
- Gỡ khỏi code còn lại: `loadSession`, `requireRole`, `orders.user_id`, `actor_user_id`, prefill địa chỉ ở checkout, menu tài khoản ở Header, `AuthProvider` trong `App.tsx`, route `/login`, `/register`, `/account*` trong `app.ts`, script `user:create-admin` và `test:auth`/`test:account` trong `package.json`, các bước tạo admin trong `setup.mjs`, biến `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH` trong `.env.example` (biến mới `ADMIN_ENABLED` ở Phần 2 thì giữ).
- Thêm một dòng ở đầu `docs/qa/2026-11-11-task-F3.md` và `task-F4.md`: "Đã hủy ngày 11/11/2026, code đã gỡ ở R1."
- Grep để chắc không còn sót: `users|sessions|harmea_session|requireRole|loadSession|/api/me|/api/auth|AuthProvider|create-admin|ADMIN_PASSWORD|ADMIN_USERNAME|admin_sessions`. Ghi kết quả grep vào báo cáo.

## Phần 2 — Bỏ admin login, admin chạy sau gate fail-closed

- Gỡ `admin_sessions`: bảng này nằm trong `001_init.sql` (đã áp vào DB local của người dùng), nên **viết migration mới** `003_drop_admin_auth.sql` để drop bảng, không sửa file 001.
- Gỡ trang `/admin/login`, `useAdminAuth`, logic logout và kiểm tra hết phiên. `/admin` vào thẳng danh sách đơn.
- **Gate:** middleware `adminGate` đặt ở `/api/admin` và các route HTML `/admin*`:
  - `ADMIN_ENABLED` mặc định `true` khi `NODE_ENV` khác `production`, mặc định **`false`** khi `NODE_ENV=production`.
  - Khi tắt: trả **404** dạng JSON lỗi chung cho `/api/admin*`, và trang 404 cho `/admin*`. Không để lộ rằng admin tồn tại.
  - Khi bật trong production: log cảnh báo một lần lúc khởi động, "Admin đang bật; phải được bảo vệ ở reverse proxy" (không log giá trị bí mật nào).
- Các API admin giữ nguyên chức năng (danh sách, chi tiết, ảnh riêng, đổi trạng thái có `expectedVersion`). Lịch sử trạng thái ghi `actor='admin'`.
- Ảnh trong `storage/uploads` vẫn **không** phục vụ public; chỉ đi qua API admin (khi gate bật).
- Cập nhật AGENTS.md: thay quy tắc "mọi endpoint admin phải xác thực server-side" bằng "admin không có đăng nhập trong app; bắt buộc gate `ADMIN_ENABLED` fail-closed ở production và bảo vệ bằng reverse proxy (do người vận hành cấu hình)".

## Phần 3 — Tra cứu đơn bằng mã đơn + SĐT, bỏ token

- Migration mới (gộp chung `003_drop_admin_auth.sql` hoặc tách thành `004_order_lookup.sql`, agent chọn và ghi lý do):
  - Thêm `orders.lookup_phone_hash CHAR(64)`, **lưu HMAC-SHA256 của SĐT đã chuẩn hóa**, khóa HMAC lấy từ env `LOOKUP_SECRET`. Không lưu thêm SĐT dạng thô ngoài snapshot người nhận đã có.
  - Backfill cho các đơn đã có: chạy script Node `scripts/backfill-lookup.mjs` (vì SQL không có khóa HMAC). Sau backfill thì đặt cột `NOT NULL`, bằng một migration tiếp theo hoặc bằng bước kiểm tra trong script; ghi cách làm vào README.
  - Bỏ `tracking_token_hash` (drop cột và unique index).
- **Chuẩn hóa SĐT** (một hàm dùng chung lúc tạo đơn và lúc tra cứu): bỏ khoảng trắng, dấu chấm, gạch; `+84`/`84` ở đầu đổi thành `0`; kết quả phải khớp `^0[0-9]{9,10}$`. Unit test cho các dạng nhập phổ biến.
- `POST /api/tracking/lookup` body `{ orderNumber, phone }`:
  - Mã đơn chuẩn hóa thành chữ hoa và trim, phải khớp `^HM-[0-9A-F]{16}$`.
  - So khớp bằng `timingSafeEqual`. Sai mã đơn hay sai SĐT đều trả **404 cùng một thông báo**.
  - **Rate limit**: 5 lần thử sai / 15 phút cho mỗi mã đơn **và** 20 lần / 15 phút cho mỗi IP, trả 429 kèm `Retry-After`. Lưu bộ đếm trong memory là đủ cho một instance; ghi giới hạn này vào README.
  - Response giữ **allowlist** công khai như hiện tại: mã đơn, trạng thái, thời gian, lịch sử trạng thái, mã vận đơn. **Không** có tên, SĐT, địa chỉ, ảnh, thiết kế hay URL nhạc.
  - Không đưa mã đơn hay SĐT vào query string hay log.
- `POST /api/orders`: response trả `orderNumber` (không còn `trackingToken`). Checkout pending (`sessionStorage`) và chống gửi trùng (`requestKey`) **giữ nguyên quy tắc của task C**. Gặp 409 trùng thì báo "đơn đã được ghi nhận, tra cứu bằng mã đơn và SĐT".
- Trang success: hiện **mã đơn to, rõ**, nút sao chép, và hướng dẫn "Tra cứu tại /track bằng mã đơn + SĐT đã nhập".
- Trang `/track`: form gồm hai ô (mã đơn, SĐT), hiện kết quả tiến độ. Bỏ đọc fragment `#token`.
- `scripts/seed-demo.mjs`: bỏ file `storage/demo-links.json`, in ra mã đơn của 2 đơn demo (mã đơn không phải bí mật; SĐT demo là số hư cấu).
- `.env.example` thêm `LOOKUP_SECRET` (bí mật, bắt buộc, chuỗi ngẫu nhiên ≥ 32 byte). `setup.mjs` sinh giá trị cho dev. **Thiếu `LOOKUP_SECRET` khi production thì app từ chối khởi động** với thông báo rõ ràng.

## Phần 4 — Tài liệu và contract

- Contract lên **0.4.0**: bỏ `/api/auth/*`, `/api/me*`, `/api/admin/session` và mọi schema User/Me. Sửa schema của `/api/tracking/lookup` và response tạo đơn.
- Sửa docs/01 (vai trò: Khách, Người có mã đơn + SĐT, Admin sau gate), docs/02, docs/03, docs/04 (checklist), README và AGENTS.md theo D2–D6.

## Test bắt buộc (MySQL thật)

1. Tạo đơn → response có `orderNumber`, không có `trackingToken`. DB có `lookup_phone_hash` đúng (tính lại HMAC trong test), không có cột token.
2. Tra cứu đúng mã + SĐT (thử các dạng: `0912 345 678`, `+84912345678`, `84-912-345-678`) → 200, đúng allowlist. Response không chứa tên, SĐT, địa chỉ hay URL nhạc (quét chuỗi JSON).
3. Sai SĐT, sai mã, mã sai định dạng → 404 với thông báo giống hệt nhau. Lần sai thứ 6 cho cùng một mã → 429. Đổi IP vẫn bị chặn theo mã. Lần thử đúng sau khi hết thời gian khóa → 200.
4. Admin gate: `NODE_ENV=production` không đặt `ADMIN_ENABLED` → `/api/admin/orders` và `/admin` trả 404. Đặt `ADMIN_ENABLED=true` → hoạt động. Dev mặc định bật. Ảnh đơn không truy cập được khi gate tắt.
5. Chuyển trạng thái đơn: hợp lệ, sai bước, version cũ (409) vẫn đúng như trước; lịch sử ghi `actor='admin'`.
6. Production thiếu `LOOKUP_SECRET` → tiến trình thoát với mã khác 0 và thông báo rõ.
7. Toàn bộ suite cũ còn lại qua sau khi gỡ auth (cập nhật các test admin bỏ bước login).
8. Backfill: tạo đơn kiểu cũ không có hash, chạy script → có hash, tra cứu được.

## Hoàn thành khi

Mọi test qua. Grep ở Phần 1 sạch. `format:check` qua trên các file R1 sửa. Kiểm tra bằng HTTP: đặt đơn → tra cứu bằng mã + SĐT → admin đổi trạng thái → tra cứu thấy trạng thái mới. Báo cáo `docs/qa/<ngày>-task-R1.md` ghi rõ migration nào là mới, kết quả kiểm tra `schema_migrations` ở DB local, và phần UI chưa được kiểm tra trên trình duyệt (nếu chưa).

## Prompt giao việc

```text
Thực hiện task R1 trong tasks/01-R1-no-login-order-lookup.md. Đọc tasks/00-ROADMAP.md (quyết định D2–D4, trạng thái working tree), AGENTS.md, README.md, docs/01–04, contracts/openapi.json, báo cáo F2/F3/F4 trong docs/qa, toàn bộ apps/api/src/modules, apps/web/src/features/{admin,checkout,tracking,account}, apps/web/src/app, scripts/ và tests/.

Người dùng đã bỏ toàn bộ đăng nhập. Gỡ sạch code F3/F4 đã hủy nhưng giữ F2 và các thay đổi giao diện storefront. Kiểm tra schema_migrations trước khi xóa 003_users.sql. Bỏ admin login, thêm gate ADMIN_ENABLED fail-closed ở production (trả 404 khi tắt). Thay token tracking bằng tra cứu mã đơn + SĐT: HMAC SĐT chuẩn hóa với LOOKUP_SECRET, so khớp timing-safe, cùng một lỗi 404, rate limit theo mã đơn và theo IP, response allowlist. Có migration mới cho mọi thay đổi trên bảng đã áp dụng, có script backfill. Cập nhật contract 0.4.0, docs, AGENTS.md và README.

Viết đủ 8 nhóm test bắt buộc trên MySQL. Chạy typecheck, build, contract:check, format:check (chỉ các file R1 sửa) và mọi test. Viết báo cáo docs/qa/<ngày>-task-R1.md. Không commit, không tạo nhánh, không push: để thay đổi trong working tree cho Claude kiểm tra.
```
