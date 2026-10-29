# A — API, dữ liệu và quyền truy cập

**Trạng thái:** công việc cần triển khai; kiểm tra `README.md` để biết khung hiện có. **Dự kiến:** 2,5 giờ sau bước chuẩn bị.

## Phạm vi và phụ thuộc

Đọc các tài liệu `docs/01-requirements.md`, `docs/02-architecture.md`, `docs/03-data-api.md`, `docs/04-acceptance-demo.md` và `contracts/openapi.json`. Tận dụng migration/seed và lớp database đã có; không tạo một nguồn schema thứ hai.

Các đường dẫn dự kiến phụ trách: `apps/api/src/modules/`, middleware/config liên quan và kiểm tra tích hợp API. Chỉ sửa `database/` hoặc hợp đồng nếu phát hiện lỗi thực sự; khi sửa phải đồng bộ tài liệu và báo các phần frontend bị ảnh hưởng. Không sửa giao diện.

## Kết quả phải có

- API đọc sản phẩm hiện tại; tạo đơn multipart theo hợp đồng, kiểm tra dữ liệu/ảnh và tính tiền hàng ở máy chủ.
- Lưu snapshot thiết kế, giá, template và URL; tệp nằm trong kho riêng, không bật static serving cho toàn bộ thư mục ảnh.
- Sinh token tracking ngẫu nhiên, chỉ lưu hash; trả token thô một lần khi tạo đơn. Lần gửi trùng `requestKey` trả lỗi 409, không tạo dòng thứ hai.
- API tracking chỉ trả trường được công khai; không lộ người nhận, số điện thoại, địa chỉ, ảnh, thiết kế hoặc URL nhạc.
- Đăng nhập/đăng xuất một admin bằng cookie session; xem danh sách/chi tiết/ảnh qua quyền admin.
- Chuyển trạng thái đúng sơ đồ và `expectedVersion`; cập nhật đơn và lịch sử trong cùng transaction.
- Bảo đảm lỗi ghi database/tệp không để lộ tệp hoặc đơn hoàn tất một nửa; dọn tệp vừa ghi khi transaction tạo đơn thất bại.

## Hoàn thành khi

1. Tạo một đơn bằng dữ liệu mẫu, kiểm tra giá tính từ sản phẩm và dữ liệu lưu trong database.
2. Gửi lại cùng `requestKey` không sinh đơn mới.
3. Request thiếu quyền không đọc được các endpoint/ảnh admin; token tracking không hợp lệ nhận kết quả theo hợp đồng.
4. Chuyển trạng thái hợp lệ thành công; chuyển sai hoặc version cũ bị từ chối; lịch sử khớp trạng thái.
5. Khởi động lại server vẫn tra cứu được đơn cũ; chạy typecheck/build và kiểm tra tích hợp có ý nghĩa.

## Prompt giao việc

```text
Triển khai task A trong tasks/A-api-data.md của dự án Harméa. Trước khi sửa, đọc AGENTS.md nếu có, README.md, docs/01-requirements.md, docs/02-architecture.md, docs/03-data-api.md, docs/04-acceptance-demo.md và contracts/openapi.json; kiểm tra phần khung đã có.

Giữ phạm vi demo một người: một sản phẩm/mẫu, một thiết kế mỗi đơn, khách không tài khoản/giỏ hàng/thanh toán. Chỉ làm backend và kiểm tra liên quan. Dùng adapter database, migration và cấu hình đã có; không đổi stack hoặc thêm ORM. Tuân thủ hợp đồng JSON/multipart, bảo vệ tệp riêng, snapshot bất biến, token tracking, quyền admin và state machine. Không trả dữ liệu giả thành kết quả đã lưu. Nếu hợp đồng mâu thuẫn, sửa nhất quán và ghi rõ ảnh hưởng thay vì âm thầm đổi tên trường.

Hoàn thành các điều kiện Done trong task; báo file đã sửa, lệnh kiểm tra, kết quả thực đo và phần còn thiếu. Không triển khai cloud hoặc thêm chức năng ngoài MVP.
```
