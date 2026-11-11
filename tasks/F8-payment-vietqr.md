# F8 — (Tùy chọn) Thanh toán chuyển khoản VietQR, admin xác nhận

**Trạng thái:** chưa làm, **chỉ làm khi người dùng xác nhận**. **Ước lượng:** 3–4 giờ. **Phụ thuộc:** F7.

## Mục tiêu

Sau khi đặt đơn, khách thấy mã QR chuyển khoản (chuẩn VietQR/EMVCo) với số tiền và nội dung là mã đơn. Admin đối chiếu sao kê ngân hàng rồi đánh dấu "Đã thanh toán". **Không tích hợp cổng thanh toán và không tự đối soát.**

## Cần người dùng cung cấp trước khi làm

Mã BIN ngân hàng, số tài khoản và tên chủ tài khoản nhận tiền. Thông tin này đặt trong env (`PAYMENT_BANK_BIN`, `PAYMENT_ACCOUNT_NO`, `PAYMENT_ACCOUNT_NAME`), không commit.

## Thiết kế

- Migration mới: `orders.payment_status ENUM('unpaid','paid','refunded') DEFAULT 'unpaid'`, `paid_at`, `payment_note`. Trạng thái thanh toán **tách riêng** khỏi trạng thái sản xuất/giao hàng.
- Server tự tạo payload EMVCo theo chuẩn VietQR (có CRC16-CCITT), số tiền lấy từ snapshot của đơn. Trả ảnh SVG/PNG sinh bằng thư viện `qrcode` (đã duyệt trong D4) tại `GET /api/orders/{id}/payment-qr`. Endpoint yêu cầu token tracking trong body (POST) hoặc user là chủ đơn. **Không gọi dịch vụ QR bên ngoài.**
- Trang success, tracking và đơn của tôi hiển thị QR cùng hướng dẫn khi `unpaid` và đơn chưa bị hủy.
- Admin: nút "Đánh dấu đã thanh toán" và "Hoàn tiền" (có xác nhận, ghi audit log, ghi version). Danh sách đơn lọc được theo `payment_status`. CSV và thống kê có thêm doanh thu đã thu.
- Tracking public chỉ trả thêm `paymentStatus`.

## Test bắt buộc

Unit test CRC và payload EMVCo với vector mẫu (tính tay hoặc lấy từ tài liệu chuẩn, ghi nguồn). Số tiền trong QR bằng tổng của snapshot. Người lạ không có token hay quyền chủ đơn không lấy được QR. Đơn đã hủy không có QR. Chỉ admin đổi được payment_status, và thao tác này có ghi audit.

## Hoàn thành khi

Mọi test qua. Báo cáo ghi rõ **chưa quét thử bằng app ngân hàng thật** nếu chưa thực hiện. Người dùng phải tự quét thử với số tiền nhỏ trước khi chạy thật.

## Prompt giao việc

```text
Thực hiện task F8 trong tasks/F8-payment-vietqr.md, chỉ khi người dùng đã cung cấp thông tin ngân hàng qua env. Đọc tasks/00-ROADMAP-v2.md, AGENTS.md, docs/03, contracts/openapi.json, module orders/admin.

Thêm payment_status tách khỏi trạng thái đơn, sinh QR VietQR/EMVCo phía server bằng thư viện qrcode (không gọi dịch vụ ngoài), kiểm soát quyền xem QR, admin xác nhận đã thanh toán hoặc hoàn tiền có audit. Không tích hợp cổng thanh toán.

Viết test bắt buộc. Cập nhật contract và docs. Chạy typecheck, build, contract:check và mọi test. Viết báo cáo docs/qa/<ngày>-task-F8.md, commit trên nhánh feat/F8-payment-vietqr. Không push.
```
