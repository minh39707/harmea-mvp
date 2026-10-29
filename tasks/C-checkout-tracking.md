# C — Đặt hàng và theo dõi đơn

**Trạng thái:** công việc cần triển khai. **Dự kiến:** 1,5 giờ. **Phụ thuộc:** API của A và đầu ra thiết kế của B.

## Phạm vi và quyền sửa

Đọc `docs/01-requirements.md`, `docs/02-architecture.md`, `docs/03-data-api.md`, `docs/04-acceptance-demo.md` và `contracts/openapi.json`.

Các đường dẫn dự kiến phụ trách: `apps/web/src/features/checkout/`, `apps/web/src/features/tracking/`, API client và route liên quan. Không viết một bộ dữ liệu mock riêng thay cho API đã có; không tự sửa quy tắc giá hoặc schema.

## Kết quả phải có

- Khách xác nhận thiết kế, chọn 1–10 bản, nhập người nhận/điện thoại/địa chỉ và ghi chú tùy chọn.
- Hiển thị tiền hàng theo giá sản phẩm; ghi rõ phí giao hàng chưa bao gồm và không có thanh toán trên website.
- Gửi một multipart request đúng hợp đồng gồm payload, ảnh gốc và preview. Giữ `requestKey` cho cùng một lần gửi; khóa nút khi đang gửi.
- **QA-07 (chuyển từ task E):** sau khi checkout thành công, reset `requestKey` và `signature` để lần đặt mới có khóa mới. Kiểm tra đặt hai lần có nội dung giống hệt tạo hai đơn khác nhau, còn retry lần gửi chưa rõ kết quả vẫn giữ khóa và không tạo thêm đơn; E chỉ kiểm tra hồi quy.
- Màn hình thành công hiển thị mã đơn và liên kết theo dõi `/track#token`, có thao tác sao chép. Không đặt token trong query string hoặc log.
- Trang theo dõi đọc fragment và gửi token trong body tới API; chỉ hiển thị trường công khai và có nút làm mới.
- Xử lý validation, lỗi mạng, token sai và request trùng. Không tự gửi đơn lần hai với khóa mới khi kết quả lần đầu chưa rõ. Nếu mất response đầu và nhận 409, hướng dẫn liên hệ cửa hàng theo giới hạn MVP; không giả định có API khôi phục token.

## Hoàn thành khi

1. Đặt đơn từ designer thành công bằng API thật, nhận liên kết và mở lại được trang theo dõi.
2. Hai lần bấm nhanh không tạo hai đơn; lỗi form có thông báo rõ và không mất dữ liệu đang nhập.
3. Admin đổi trạng thái thì nút làm mới hiển thị trạng thái mới.
4. Không có ảnh, địa chỉ, điện thoại hoặc thiết kế riêng trong response/nội dung trang theo dõi; không lưu token vào log.
5. Typecheck/build qua; ghi rõ kịch bản đã kiểm tra trong trình duyệt.

## Prompt giao việc

```text
Triển khai task C trong tasks/C-checkout-tracking.md. Đọc AGENTS.md nếu có, README.md, docs/01-requirements.md, docs/02-architecture.md, docs/03-data-api.md, docs/04-acceptance-demo.md và contracts/openapi.json; kiểm tra API A và đầu ra designer B đang có.

Nối luồng xem trước → xác nhận → form người nhận → gửi đơn → trang thành công → tracking. Không thêm tài khoản khách, giỏ hàng hoặc thanh toán. Dùng multipart và tên trường theo hợp đồng, giữ requestKey khi retry và không che giới hạn mất response/không khôi phục token. Tracking token đi qua URL fragment rồi POST body; chỉ hiển thị dữ liệu công khai. Tiền hàng không bao gồm phí vận chuyển. Ưu tiên hoàn thành luồng với API thật trước trang trí.

Kiểm tra tạo đơn, lỗi form/mạng, gửi trùng và làm mới trạng thái sau admin update; chạy typecheck/build. Báo phần đã làm, kiểm tra thực tế và giới hạn còn lại, không tuyên bố hoạt động nếu chỉ dùng fixture.
```
