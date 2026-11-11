# R5 — (Tùy chọn) Thanh toán chuyển khoản VietQR, admin xác nhận

**Trạng thái:** chưa làm, **chỉ làm khi người dùng xác nhận và cung cấp thông tin ngân hàng**. **Ước lượng:** 3 giờ. **Phụ thuộc:** R4.

## Mục tiêu

Sau khi đặt đơn, khách thấy QR chuyển khoản theo chuẩn VietQR/EMVCo, với số tiền và nội dung chuyển khoản là mã đơn. Admin đối chiếu sao kê rồi đánh dấu "Đã thanh toán". Không tích hợp cổng thanh toán, không tự đối soát.

## Cần người dùng cung cấp

Mã BIN ngân hàng, số tài khoản, tên chủ tài khoản. Đặt trong env `PAYMENT_BANK_BIN`, `PAYMENT_ACCOUNT_NO`, `PAYMENT_ACCOUNT_NAME`, không commit. Thiếu biến thì tính năng tự ẩn.

## Thiết kế

- Migration mới: `orders.payment_status ENUM('unpaid','paid','refunded') DEFAULT 'unpaid'`, `paid_at`, `payment_note`. Tách riêng khỏi trạng thái sản xuất.
- Server tự tạo payload EMVCo (có CRC16-CCITT), số tiền lấy từ snapshot của đơn. Sinh SVG bằng thư viện `qrcode` (D8). **Không gọi dịch vụ QR bên ngoài.**
- Lấy QR: hiện ngay ở trang success (dùng dữ liệu trả về khi tạo đơn) và qua `POST /api/tracking/payment-qr` `{orderNumber, phone}`, dùng chung xác minh và rate limit với tra cứu của R1.
- Tracking public trả thêm `paymentStatus`. Đơn đã hủy không có QR.
- Admin: nút "Đánh dấu đã thanh toán" / "Hoàn tiền" có xác nhận, có `version`, ghi vào lịch sử. Lọc đơn theo `payment_status`. Stats và CSV có thêm doanh thu đã thu.

## Test bắt buộc

Unit test CRC và payload với vector mẫu (ghi nguồn). Số tiền trong QR bằng tổng của snapshot. Sai SĐT không lấy được QR, có rate limit. Đơn hủy không có QR. Chỉ API admin (sau gate) đổi được `payment_status`.

Báo cáo ghi rõ **chưa quét thử bằng app ngân hàng thật** nếu chưa làm. Người dùng phải tự quét thử với số tiền nhỏ trước khi chạy thật.

## Prompt giao việc

```text
Thực hiện task R5 trong tasks/05-R5-payment-vietqr-optional.md, chỉ khi người dùng đã cung cấp thông tin ngân hàng qua env. Đọc tasks/00-ROADMAP.md, AGENTS.md, docs/03, contracts/openapi.json, báo cáo R1/R3, module orders/admin/tracking.

Thêm payment_status tách khỏi trạng thái đơn, sinh QR VietQR/EMVCo phía server bằng thư viện qrcode (không gọi dịch vụ ngoài), lấy QR bằng mã đơn + SĐT với cùng rate limit của R1, admin xác nhận đã thanh toán hoặc hoàn tiền có version và lịch sử. Không tích hợp cổng thanh toán.

Viết test bắt buộc, cập nhật contract và docs. Chạy typecheck, build, contract:check, format:check (file R5 sửa) và mọi test. Viết báo cáo docs/qa/<ngày>-task-R5.md. Không commit, không tạo nhánh, không push: để thay đổi trong working tree cho Claude kiểm tra.
```
