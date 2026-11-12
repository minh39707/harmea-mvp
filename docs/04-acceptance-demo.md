# Checklist nghiệm thu Harméa

Checklist này tách kết quả tự động khỏi thao tác giao diện. Chỉ đánh dấu PASS khi chạy thật và ghi kết quả trong [báo cáo QA](qa/).

## Chuẩn bị local

1. Dùng Node.js 24.x và MySQL 8.4.
2. Chạy `npm.cmd ci --ignore-scripts`, `npm.cmd run setup`.
3. Khởi động MySQL local, chạy `npm.cmd run db:migrate`.
4. Nếu migration 005 báo hoãn do đơn cũ thiếu hash, chạy `npm.cmd run db:backfill-lookup`, rồi `npm.cmd run db:migrate` lần nữa.
5. Chạy `npm.cmd run db:check` và `npm.cmd run dev`.

`setup` không tạo tài khoản admin. Ở local, admin gate mặc định bật. Production mặc định tắt; chỉ bật `ADMIN_ENABLED=true` sau khi reverse proxy bảo vệ cả `/admin*` và `/api/admin*`. Production thiếu `LOOKUP_SECRET` hợp lệ thì API không khởi động.

## Kiểm tra tự động

- [ ] `npm.cmd run typecheck`
- [ ] `npm.cmd run build`
- [ ] `npm.cmd run contract:check`
- [ ] `npm.cmd run format:check`
- [ ] `npm.cmd run test:api`
- [ ] `npm.cmd run test:editor`
- [ ] `npm.cmd run test:checkout`
- [ ] `npm.cmd run test:admin`
- [ ] `npm.cmd run test:admin-extended`
- [ ] `npm.cmd run test:setup`
- [ ] `npm.cmd run test:smoke`

Các test API/lookup/admin/state/ảnh chạy trên MySQL thật trong DB thử riêng. Kết quả cụ thể và lệnh đã chạy được ghi trong báo cáo R1/R2 tại `docs/qa/`; checklist này không tự cập nhật theo test.

## Luồng khách trên trình duyệt

- [ ] Mở trang chủ và sản phẩm; xem gallery, editor và responsive ở 375, 768, 1440 CSS px.
- [ ] Tạo hai thiết kế, sửa một thiết kế, đổi số lượng và xác nhận giỏ còn sau reload.
- [ ] Mở checkout, nhập tên/SĐT/địa chỉ giả, xác nhận thiết kế và đặt đơn.
- [ ] Trang thành công hiển thị mã `HM-…` rõ, nút sao chép hoạt động và hướng dẫn nhớ SĐT đã nhập.
- [ ] Mở `/track`, nhập mã đơn và thử SĐT theo dạng `0912 345 678`, `+84912345678`, `84-912-345-678`; tiến độ hiện đúng.
- [ ] Sai SĐT hoặc mã cho thông báo chung; không response/UI nào lộ PII, ảnh, thiết kế, URL nhạc hoặc ghi chú.
- [ ] Reload trang không tự tra cứu qua fragment/query string.

## Luồng admin và dữ liệu

- [ ] Ở dev, mở `/admin` trực tiếp; không có bước đăng nhập. Danh sách/chi tiết khớp đơn vừa tạo.
- [ ] Ảnh preview và ảnh gốc xem/tải được qua API admin; URL public `/storage/uploads/...` không truy cập được.
- [ ] Chuyển `pending → confirmed`; lịch sử hiện actor admin và khách tra cứu thấy trạng thái mới.
- [ ] Thử status sai bước và version cũ; API trả 409, không ghi event sai.
- [ ] Trong menu admin, tìm đơn bằng cả mã đầy đủ và tiền tố; tải CSV rồi mở bằng Excel/LibreOffice để kiểm tra dấu tiếng Việt và không có URL nhạc.
- [ ] Sửa giá/mô tả sản phẩm, xác nhận thao tác đổi giá/tắt sản phẩm; kiểm tra đơn cũ giữ snapshot giá, đơn mới dùng giá mới.
- [ ] Tắt sản phẩm để storefront hiện “Tạm ngừng nhận đơn”; thử gửi đơn và xác nhận API trả `PRODUCT_INACTIVE`.
- [ ] Xem thống kê với khoảng ngày có đơn lúc 23:30 giờ Việt Nam; số đơn phải nằm đúng ngày địa phương.
- [ ] Production không đặt `ADMIN_ENABLED` thì `/admin` và `/api/admin/orders` cùng trả 404 chung.
- [ ] Production bật admin chỉ sau khi kiểm tra reverse proxy từ bên ngoài.

Integration MySQL R3 được chạy riêng bằng `npm.cmd run test:admin-extended`; thao tác trên đây vẫn cần được kiểm tra trong browser thật ở các cỡ màn hình.

## Giới hạn cần ghi nhận

- HMAC lookup giữ nguyên khi `LOOKUP_SECRET` giữ nguyên. Nếu xoay secret, cần có kế hoạch backfill lại tất cả hash từ snapshot trước khi người dùng tra cứu.
- Bộ đếm lookup lưu trong memory của một instance; restart xóa bộ đếm và nhiều instance chưa được hỗ trợ.
- API/MySQL tests không xác nhận thao tác thực trên trình duyệt, Docker image, reverse proxy hoặc server production.
- Dữ liệu và ảnh demo là giả. Giá demo không phải báo giá; không thu tiền và không tự động sản xuất/giao hàng.
