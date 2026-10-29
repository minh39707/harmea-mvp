# D — Quản trị, tích hợp và diễn tập

**Trạng thái:** code admin và dữ liệu diễn tập đã triển khai ngày 29/10/2026; chưa nghiệm thu UI/diễn tập 5–7 phút. **Dự kiến:** 1 giờ quản trị, cộng 0,5–2,5 giờ diễn tập/sửa lỗi. **Phụ thuộc:** A; kiểm tra toàn luồng cần B và C.

Kết quả thực tế: [báo cáo D](../docs/qa/2026-10-29-task-d.md), 10 tests D qua với API/PGlite/tệp thật; regression A 25, B 8, C 13 qua. Có `/admin/login`, `/admin/orders`, chi tiết đơn và `npm run demo:seed`. Chưa có bằng chứng thao tác trình duyệt, mobile, PostgreSQL hoặc NFC; checklist nghiệm thu vẫn chờ. Code E Giai đoạn 2 là việc tiếp theo theo thứ tự đã chốt.

## Phạm vi và quyền sửa

Đọc `docs/01-requirements.md`, `docs/02-architecture.md`, `docs/03-data-api.md`, `docs/04-acceptance-demo.md` và `contracts/openapi.json`.

Các đường dẫn dự kiến phụ trách: `apps/web/src/features/admin/`, route liên quan và kiểm tra tích hợp. Chỉ sửa các phần khác khi giải quyết lỗi nối luồng đã xác định; giữ hợp đồng thống nhất. Không bổ sung dashboard biểu đồ hoặc quản lý sản phẩm đầy đủ cho demo này.

## Kết quả phải có

- Trang đăng nhập admin, trạng thái hết phiên và đăng xuất; dùng cookie do server cấp, không lưu mật khẩu/session token trong localStorage.
- Danh sách đơn và chi tiết: thiết kế/preview, ảnh gốc, URL nhạc, số lượng, tiền hàng, người nhận và lịch sử trạng thái.
- Chỉ hiện thao tác chuyển trạng thái hợp lệ; gửi `expectedVersion`. Khi bị 409 do dữ liệu cũ, tải lại đơn và yêu cầu xác nhận thao tác thay vì tự ghi đè.
- Hủy đơn đúng giai đoạn và có lý do; mã vận đơn nếu có được nhập thủ công.
- Truy cập ảnh/preview qua endpoint có xác thực; không dựng đường dẫn trực tiếp vào kho tệp.
- Chuẩn bị dữ liệu demo hư cấu và chạy checklist nghiệm thu; ghi lại kết quả thực tế trong báo cáo kiểm tra, không ghi đè bản requirement thành “đã xong”.

## Hoàn thành khi

1. Chưa đăng nhập không đọc được dữ liệu admin, kể cả gọi API trực tiếp; đăng xuất làm mất quyền.
2. Đơn tạo từ C xuất hiện và thông tin khớp thiết kế B; cập nhật trạng thái phản ánh trên tracking khách.
3. Thử ít nhất một chuyển trạng thái sai, một xung đột version và một đơn có tên tiếng Việt.
4. Khởi động lại vẫn thấy đơn/ảnh/lịch sử; kiểm tra bằng checklist `docs/04-acceptance-demo.md`.
5. Typecheck/build qua, kịch bản 5–7 phút chạy được; nêu rõ các kiểm tra chưa thực hiện hoặc giới hạn còn lại.

## Prompt giao việc

```text
Triển khai task D trong tasks/D-admin-demo.md. Đọc AGENTS.md nếu có, README.md, docs/01-requirements.md, docs/02-architecture.md, docs/03-data-api.md, docs/04-acceptance-demo.md, contracts/openapi.json và kiểm tra mã hiện tại.

Làm admin tối thiểu: login/logout, danh sách/chi tiết đơn, xem ảnh riêng tư, đổi trạng thái đúng quy tắc và expectedVersion. Không thêm dashboard, thanh toán, vận chuyển thật hoặc quản lý nhiều sản phẩm. Nối vào API thật bằng cookie session; kiểm tra quyền ở API, không chỉ ẩn nút. Khi lỗi version, tải lại và cho người dùng xác nhận, không tự ghi đè.

Sau đó chạy toàn luồng khách thiết kế → đặt đơn → admin cập nhật → khách theo dõi, dùng dữ liệu hư cấu. Kiểm tra lưu bền qua restart và các trường hợp lỗi quan trọng trong checklist. Chạy typecheck/build và báo kiểm tra thực tế, lỗi đã sửa, chức năng còn thiếu. Chỉ kiểm chứng NFC vật lý nếu có phần cứng; mở URL không được ghi nhận là thử NFC. Không deploy cloud.
```
