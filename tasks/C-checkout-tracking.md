# C — Đặt hàng và theo dõi đơn

**Trạng thái:** đã triển khai code checkout/tracking canonical và kiểm tra tích hợp; còn nghiệm thu UI trên trình duyệt. **Ước lượng ban đầu:** 1,5 giờ. **Phụ thuộc:** API của A và đầu ra thiết kế của B.

**Cập nhật 29/10/2026:** frontend không còn gọi route demo hoặc dùng alias Product cũ. QA-07 đã sửa bằng coordinator reset khóa sau thành công; request chưa rõ kết quả giữ cùng khóa/fingerprint trong sessionStorage, không lưu PII/token vào record này. `npm.cmd run test:checkout` đã qua 13 tests với Express/PGlite/file thật. Xem [báo cáo C](../docs/qa/2026-10-29-task-c.md); phần browser/IndexedDB/clipboard chưa được đánh dấu PASS.

**Hợp đồng cập nhật sau A:** dùng `contracts/openapi.json` 0.2.0. Public tracking chỉ trả tiến độ/lịch sử, không có subtotal; success dùng OrderCreated để hiển thị tiền. Product dùng `isDemo` và các kích thước canonical; alias `isDemoPrice`/`image`/`cardSizeMm` chỉ giữ tạm cho client cũ. Sau khi nối xong, xử lý rõ các draft/đơn legacy, không tự đưa chúng vào luồng admin mới.

**Đầu ra B:** dùng `preparedItem(item)` từ `features/editor/prepared-item.ts`: trả `{ payload, photo, preview }`, trong đó payload có productId/templateVersion/quantity/design đúng contract và hai Blob lấy từ IndexedDB bằng assetKey. Không gửi local `design.photo`, photoWidth/photoHeight hoặc assetKey vào JSON. Giữ key metadata `harmea.cart.v2`; giỏ cũ vẫn đọc được nhưng không có ảnh gốc phải mở sửa/chọn lại ảnh, không dùng thumbnail thay ảnh gốc. C cần kiểm tra lại luồng IndexedDB thực trên trình duyệt khi công cụ khả dụng.

## Phạm vi và quyền sửa

Đọc `docs/01-requirements.md`, `docs/02-architecture.md`, `docs/03-data-api.md`, `docs/04-acceptance-demo.md` và `contracts/openapi.json`.

Các đường dẫn dự kiến phụ trách: `apps/web/src/features/checkout/`, `apps/web/src/features/tracking/`, API client và route liên quan. Không viết một bộ dữ liệu mock riêng thay cho API đã có; không tự sửa quy tắc giá hoặc schema.

## Kết quả phải có

- Khách xác nhận thiết kế, chọn 1–10 bản, nhập người nhận/điện thoại/địa chỉ và ghi chú tùy chọn.
- Hiển thị tiền hàng theo giá sản phẩm; ghi rõ phí giao hàng chưa bao gồm và không có thanh toán trên website.
- Gửi một multipart request đúng hợp đồng gồm payload có `items[]` và cặp `photo_i`/`preview_i` cho mỗi dòng i từ 0. Mỗi đơn 1–10 thiết kế cùng mẫu, mỗi dòng 1–10 bản; tổng request ≤16 MiB, từng ảnh gốc ≤5 MiB, preview PNG ≤2 MiB. Giữ `requestKey` cho cùng một lần gửi; khóa nút khi đang gửi.
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

Nối luồng xem trước → giỏ hàng (sửa/xóa từng thiết kế) → xác nhận → form người nhận → gửi đơn → trang thành công → tracking. Giữ giỏ hàng đã chốt, không thêm tài khoản khách hoặc thanh toán. Chuyển từ `/api/demo-checkouts`/`demo-tracking` sang `/api/orders` multipart và `/api/tracking/lookup`; các đơn demo legacy không tự xuất hiện trong admin mới. Dùng multipart và tên trường theo hợp đồng, giữ requestKey khi retry và không che giới hạn mất response/không khôi phục token. Tracking token đi qua URL fragment rồi POST body; chỉ hiển thị dữ liệu công khai. Tiền hàng không bao gồm phí vận chuyển. Ưu tiên hoàn thành luồng với API thật trước trang trí.

Kiểm tra tạo đơn, lỗi form/mạng, gửi trùng và làm mới trạng thái sau admin update; chạy typecheck/build. Báo phần đã làm, kiểm tra thực tế và giới hạn còn lại, không tuyên bố hoạt động nếu chỉ dùng fixture.
```
