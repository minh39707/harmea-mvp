# R3 — Admin mở rộng: sản phẩm/giá, thống kê, xuất CSV

**Trạng thái:** đã triển khai; kiểm tra tự động MySQL qua, còn browser QA. **Ước lượng:** 3–4 giờ. **Phụ thuộc:** R1.

## Mục tiêu

Admin (sau gate `ADMIN_ENABLED`, không có login) tự chỉnh sản phẩm, xem thống kê và xuất danh sách đơn. Không làm nhiều mẫu thẻ, không quản lý user (không còn user).

## Phạm vi file

`apps/api/src/modules/admin/` (products, stats, export), `apps/api/src/modules/catalog/`, migration mới nếu cần, `apps/web/src/features/admin/` (trang mới, menu), contract, docs, `tests/admin-extended.mjs`.

## Kết quả phải có

### Sản phẩm
- `GET /api/admin/products`, `PATCH /api/admin/products/{id}`: sửa `name`, `description`, `unit_price_vnd` (số nguyên 1.000–10.000.000), `is_active`. Có `version` để chống ghi đè (409 khi lệch version).
- **Đơn đã tạo không đổi giá** (snapshot). Test: đổi giá xong, đơn cũ giữ giá cũ, đơn mới dùng giá mới.
- Sản phẩm bị tắt thì storefront hiện "Tạm ngừng nhận đơn", `POST /api/orders` trả 409 `PRODUCT_INACTIVE`.
- Bảng `product_price_history(product_id, old_price, new_price, changed_at)` ghi trong cùng transaction khi đổi giá. Không ghi danh tính người sửa (không có login).

### Thống kê
- `GET /api/admin/stats?from=&to=` (ngày theo giờ Việt Nam UTC+7, quy đổi sang UTC khi truy vấn): số đơn theo trạng thái, doanh thu tạm tính (bỏ đơn hủy), tổng số thẻ, số đơn theo ngày. Tính bằng SQL tổng hợp.

### Xuất CSV
- `GET /api/admin/orders.csv?status=&from=&to=`: stream UTF-8 có BOM (Excel đọc được tiếng Việt). Có các cột: mã đơn, ngày, trạng thái, số thiết kế, số thẻ, tổng tiền, tên người nhận, SĐT, địa chỉ, mã vận đơn. **Không** có URL nhạc.
- Chống CSV injection: ô bắt đầu bằng `= + - @` hoặc tab thì thêm tiền tố `'`.

### UI admin
- Menu: Đơn hàng | Sản phẩm | Thống kê. Có nút "Tải CSV".
- Biểu đồ đơn theo ngày vẽ bằng SVG/CSS (không thêm thư viện chart).
- Đổi giá hay tắt sản phẩm có hộp xác nhận. Gặp 409 thì tải lại dữ liệu.
- Tìm đơn theo mã đơn ở trang danh sách (khớp chính xác hoặc theo tiền tố).

## Test bắt buộc

Gate tắt → mọi endpoint mới trả 404. Snapshot giá giữ nguyên. Sản phẩm inactive chặn đặt đơn. Version lệch → 409. Lịch sử giá ghi đúng và rollback cùng giao dịch. CSV có BOM, escape injection, không có URL nhạc. Stats khớp dữ liệu fixture, kể cả đơn tạo lúc 23:30 giờ Việt Nam được tính vào đúng ngày.

## Prompt giao việc

```text
Thực hiện task R3 trong tasks/03-R3-admin-products-stats.md. Đọc tasks/00-ROADMAP.md, AGENTS.md, báo cáo R1, docs/03, contracts/openapi.json, module admin/orders/catalog và UI features/admin.

Thêm quản lý sản phẩm (giá, mô tả, bật tắt, có version; đơn cũ giữ snapshot; lịch sử giá ghi cùng transaction), thống kê bằng SQL theo ngày giờ Việt Nam, xuất CSV UTF-8 BOM chống injection và không có URL nhạc, UI admin có menu, xác nhận thao tác và tìm đơn theo mã. Mọi route đi sau gate ADMIN_ENABLED. Không thêm thư viện chart, không làm nhiều template, không thêm login.

Viết integration test bắt buộc trên MySQL. Cập nhật contract và docs. Chạy typecheck, build, contract:check, format:check (file R3 sửa) và mọi test. Viết báo cáo docs/qa/<ngày>-task-R3.md. Không commit, không tạo nhánh, không push: để thay đổi trong working tree cho Claude kiểm tra.
```
