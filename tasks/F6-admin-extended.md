# F6 — Admin mở rộng: sản phẩm, user, thống kê, xuất CSV

**Trạng thái:** chưa làm. **Ước lượng:** 4–6 giờ. **Phụ thuộc:** F3 (có thể làm song song với F4/F5 trên checkout khác, nhưng merge sau F4).

## Mục tiêu

Admin tự quản lý sản phẩm (giá, mô tả, bật/tắt bán), quản lý user, xem thống kê và xuất danh sách đơn ra CSV. Không làm nhiều mẫu thẻ.

## Phạm vi file

`apps/api/src/modules/admin/` (products, users, stats, export), `apps/api/src/modules/catalog/` (đọc sản phẩm đang bán), migration mới (`admin_audit_log`, các cột mới của products nếu cần), `apps/web/src/features/admin/` (trang mới và menu), contract, docs, `tests/admin-extended.mjs`.

## Kết quả phải có

### Sản phẩm
- `GET /api/admin/products`, `GET /api/admin/products/{id}`, `PATCH /api/admin/products/{id}`: JSON dùng `name`, `description`, `unitPriceVnd` (số nguyên 1.000–10.000.000), `isActive` và `expectedVersion`; SQL tương ứng `unit_price_vnd`, `is_active`. Response có `version` để optimistic lock tương tự đơn hàng.
- **Đơn đã tạo không đổi giá** (snapshot). Có test: đổi giá xong, đơn cũ vẫn giữ giá cũ, đơn mới dùng giá mới.
- Sản phẩm tắt bán thì storefront hiện "Tạm ngừng nhận đơn" và `POST /api/orders` trả 409 `PRODUCT_INACTIVE`.
- Không làm upload ảnh sản phẩm hay nhiều template (ghi vào "ngoài phạm vi").

### User
- `GET /api/admin/users?q=&role=&status=&page=` (tìm theo email hoặc tên, phân trang). `PATCH /api/admin/users/{id}` {role?, status?}.
- Admin **không thể** tự hạ role hay tự khóa chính mình, và không thể làm hệ thống còn 0 admin active (kiểm tra trong transaction có khóa hàng).
- Khóa user thì xóa toàn bộ session của user đó.

### Thống kê và CSV
- `GET /api/admin/stats?from=&to=`: số đơn theo trạng thái, tổng doanh thu tạm tính (chỉ đơn không bị hủy), số thẻ, số user mới, số đơn theo ngày. Mọi phép tính dùng SQL tổng hợp, không kéo toàn bộ dữ liệu về Node.
- `GET /api/admin/orders.csv?status=&from=&to=`: stream CSV UTF-8 có BOM (để Excel hiển thị đúng tiếng Việt). Có các cột: mã đơn, ngày, trạng thái, số thiết kế, số thẻ, tổng tiền, tên người nhận, SĐT, tỉnh/thành. **Không** có URL nhạc hay token. Chống CSV injection: ô bắt đầu bằng `= + - @` thì thêm tiền tố `'`.

### Audit log
- Bảng `admin_audit_log(id, actor_user_id, action, target_type, target_id, changes JSON, created_at)`. Ghi log trong cùng transaction cho mọi thao tác: đổi giá/sản phẩm, đổi role/status user, đổi trạng thái đơn. Có trang xem log đơn giản (danh sách, lọc theo loại).
- `GET /api/admin/audit-log?page=&pageSize=&targetType=` trả danh sách phân trang, chỉ admin; dùng allowlist, không trả mật khẩu/token hoặc URL nhạc trong changes.

### UI admin
- Menu bên: Đơn hàng | Sản phẩm | Người dùng | Thống kê | Nhật ký.
- Dashboard dùng thẻ số liệu và một biểu đồ đơn theo ngày vẽ bằng SVG/CSS (không thêm thư viện chart).
- Mọi thao tác nguy hiểm (đổi giá, khóa user, đổi role) có hộp xác nhận. Gặp 409 thì tải lại dữ liệu.

## Test bắt buộc

Toàn bộ endpoint mới: user thường → 403. Snapshot giá giữ nguyên. Sản phẩm inactive chặn đặt đơn. Không thể xóa admin cuối cùng (kể cả khi gửi 2 request song song). Khóa user thì session chết. CSV có BOM, escape injection và không có cột nhạy cảm. Stats đúng với dữ liệu fixture. Audit log được ghi và rollback cùng thao tác.

## Prompt giao việc

```text
Thực hiện task F6 trong tasks/F6-admin-extended.md. Đọc tasks/00-ROADMAP-v2.md, AGENTS.md, docs/01 (FR-A1–A3), docs/03, contracts/openapi.json, module admin/orders/catalog sau F3 và UI features/admin.

Xây quản lý sản phẩm (giá/mô tả/bật tắt có version, đơn cũ giữ snapshot), quản lý user (không thể còn 0 admin, khóa thì hủy session), thống kê bằng SQL tổng hợp, xuất CSV UTF-8 BOM chống CSV injection và không có dữ liệu nhạy cảm, audit log ghi cùng transaction, UI admin có menu và xác nhận. Không thêm thư viện chart, không làm nhiều template.

Viết integration test bắt buộc trên MySQL. Cập nhật contract và docs. Chạy typecheck, build, contract:check và mọi test. Viết báo cáo docs/qa/<ngày>-task-F6.md, commit trên nhánh feat/F6-admin-extended. Không push.
```
