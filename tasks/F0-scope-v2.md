# F0 — Chốt phạm vi v2 trong tài liệu và hợp đồng

**Trạng thái:** đã hoàn thành tài liệu và contract 0.3.0 ngày 11/11/2026, kiểm tra đã chạy. Endpoint v2 vẫn planned. Xem [báo cáo F0](../docs/qa/2026-11-11-task-F0.md). **Ước lượng ban đầu:** 1–2 giờ. **Phụ thuộc:** không.

## Mục tiêu

Đưa các quyết định D1–D6 trong [00-ROADMAP-v2.md](00-ROADMAP-v2.md) vào tài liệu chuẩn, để các task sau không mâu thuẫn với `AGENTS.md`. Task này **chỉ sửa tài liệu và contract, không sửa code ứng dụng**.

## Phạm vi file

`AGENTS.md`, `README.md`, `docs/01-requirements.md`, `docs/02-architecture.md`, `docs/03-data-api.md`, `docs/04-acceptance-demo.md`, `docs/05-solo-plan.md` (đánh dấu lịch sử), `contracts/openapi.json`, `.env.example` (chỉ phần comment mô tả, chưa đổi biến). Đồng bộ các mô tả task v2 liên quan khi phát hiện lệch tên bảng, endpoint hoặc phụ thuộc; không sửa code ứng dụng.

## Kết quả phải có

1. **AGENTS.md** viết lại theo v2:
   - Stack: React/TypeScript/Vite + Express/TypeScript + **MySQL 8.4 (`mysql2`)**. Bỏ PostgreSQL/PGlite.
   - Role `user` và `admin`. Khách vẫn đặt hàng không cần tài khoản. Có thể có nhiều admin.
   - Phạm vi: một sản phẩm/mẫu thẻ (admin chỉnh giá và mô tả), giữ giỏ hàng, mỗi đơn 1–10 thiết kế, mỗi thiết kế 1–10 bản.
   - Mốc demo cũ 28/10/2026 chuyển thành lịch sử. Mục tiêu mới là website hoàn chỉnh được đóng gói Docker (image + `compose.prod.yaml` + tài liệu bàn giao). Việc triển khai lên AWS do người vận hành khác đảm nhận.
   - Giữ nguyên toàn bộ quy tắc bảo mật hiện có: fragment tracking, allowlist, không public uploads, không log dữ liệu nhạy cảm, không localStorage cho session.
   - Bổ sung: mật khẩu hash bằng scrypt; session cookie HttpOnly + SameSite=Lax + Secure khi chạy HTTPS; phân quyền kiểm tra ở server; agent không viết hạ tầng hay thao tác lên cloud.
   - Thêm câu: "Thứ tự công việc theo `tasks/00-ROADMAP-v2.md`."
2. **docs/01-requirements.md**: thêm mục "Phạm vi v2" gồm FR mới:
   - FR-U1 đăng ký, FR-U2 đăng nhập/đăng xuất, FR-U3 đơn của tôi, FR-U4 hồ sơ và địa chỉ mặc định, FR-U5 quên mật khẩu.
   - FR-A1 quản lý sản phẩm (giá, mô tả, bật/tắt), FR-A2 quản lý user (khóa/mở, đổi role), FR-A3 thống kê và xuất CSV.
   - FR-C1 các trang nội dung, FR-N1 email thông báo.
   - Bảng vai trò và quyền mới gồm: Khách, Người có link tracking, User đã đăng nhập, Admin.
   - Ghi rõ những gì vẫn **ngoài phạm vi**: nhiều mẫu thẻ, cổng thanh toán thẻ, tự động tính phí vận chuyển với hãng ship, đa ngôn ngữ.
3. **docs/02-architecture.md**: sơ đồ mới gồm Browser → Caddy (HTTPS) → Express (phục vụ `apps/web/dist` và `/api`) → MySQL, cùng volume uploads. Thêm phần Auth/Session, Mailer và Storage.
4. **docs/03-data-api.md** và **contracts/openapi.json** lên **version 0.3.0**. Thêm các endpoint dưới đây với trạng thái `x-status: planned` (dùng extension này để `contract:check` không coi là đã triển khai; nếu script không hỗ trợ thì ghi chú trong `description`):
   - `POST /api/auth/register`, `POST /api/auth/session`, `GET /api/auth/session`, `DELETE /api/auth/session`
   - `POST /api/auth/password/forgot`, `POST /api/auth/password/reset`, `PUT /api/me/password`
   - `GET /api/me`, `PATCH /api/me`, `GET /api/me/orders`, `GET /api/me/orders/{id}`
   - `GET /api/admin/products`, `GET/PATCH /api/admin/products/{id}`, `GET /api/admin/users`, `PATCH /api/admin/users/{id}`, `GET /api/admin/stats`, `GET /api/admin/orders.csv`, `GET /api/admin/audit-log`
   - Đánh dấu `/api/admin/session` và `/api/demo-*` là `deprecated` (sẽ gỡ ở F1/F3).
   - Schema `User` (id, email, displayName, role, createdAt) và `MeOrderSummary`. **Không có trường password hay hash.**
5. **docs/04-acceptance-demo.md**: thêm checklist v2, mọi mục để trống, chưa tick.
6. **README.md**: thêm một mục ngắn "Đang chuyển sang v2", link tới roadmap. Không xóa hướng dẫn chạy hiện tại; F2 sẽ cập nhật phần đó.

## Hoàn thành khi

1. `npm run contract:check` qua với contract 0.3.0.
2. Không còn yêu cầu v2 mâu thuẫn D1–D6 (soát `PGlite`, `PostgreSQL`, `không tài khoản`, `một tài khoản`). Mô tả runtime hiện tại và nội dung MVP/QA lịch sử phải được ghi nhãn rõ, không xóa hoặc viết lại bằng chứng cũ.
3. Typecheck/build vẫn qua (code không đổi).
4. Có báo cáo `docs/qa/<ngày>-task-F0.md`.

## Prompt giao việc

```text
Thực hiện task F0 trong tasks/F0-scope-v2.md của dự án Harméa. Đọc tasks/00-ROADMAP-v2.md (quy tắc chung, quyết định D1–D6), AGENTS.md, README.md, docs/01–04 và contracts/openapi.json.

Người dùng đã chấp thuận đổi phạm vi sang v2: MySQL thay PostgreSQL/PGlite, role user/admin, giữ đặt hàng không cần tài khoản, đầu ra là gói Docker bàn giao cho người vận hành (người khác lo phần AWS). Task này chỉ cập nhật tài liệu và contract (lên 0.3.0, endpoint mới ở trạng thái planned). Không sửa code ứng dụng, không đánh dấu endpoint planned là đã triển khai. Giữ nguyên mọi quy tắc bảo mật hiện có trong AGENTS.md.

Chạy contract:check, typecheck và build. Viết báo cáo docs/qa/<ngày>-task-F0.md theo mẫu trong roadmap, rồi commit trên nhánh feat/F0-scope-v2. Không push.
```
