# Yêu cầu Harméa MVP

Cập nhật 11/11/2026 theo quyết định D2–D6 trong [roadmap](../tasks/00-ROADMAP.md). Tài khoản và đăng nhập đã bị loại khỏi phạm vi. R1 triển khai tra cứu bằng mã đơn + số điện thoại, và đặt admin sau gate tắt mặc định ở production.

## Phạm vi sản phẩm

- Một sản phẩm/mẫu thẻ NFC Music Card; admin có thể chỉnh giá (1.000–10.000.000 VND), mô tả và trạng thái bán qua R3. Sản phẩm tắt hiển thị “Tạm ngừng nhận đơn”.
- Giá sản phẩm theo yêu cầu mới ngày 11/11/2026: 89.000đ qua migration 007; đơn đã gửi giữ snapshot giá cũ.
- Có giỏ hàng. Một đơn gồm 1–10 thiết kế; mỗi thiết kế đặt 1–10 bản. Giá do server lấy từ MySQL và lưu snapshot.
- Khách không tạo tài khoản. Checkout nhận tên, số điện thoại và địa chỉ giao hàng; sau khi đặt đơn, khách lưu mã đơn.
- Cập nhật 12/11/2026: hiển thị ảnh QR chuyển khoản người dùng cung cấp sau khi lưu đơn. Khách tự nhập số tiền/mã đơn và bấm “Tôi đã chuyển khoản”; server lưu lời xác nhận, admin xem để đối chiếu. Không tự động xác nhận đã nhận tiền, không đổi trạng thái sản xuất. Chưa có email, tự động sản xuất hoặc giao hàng.
- Ảnh gốc và ảnh preview chỉ gửi server khi đặt hàng; ảnh đơn chỉ có thể tải qua API admin khi gate cho phép.

## Vai trò và dữ liệu truy cập

| Vai trò | Được phép | Không được phép |
|---|---|---|
| Khách | Xem sản phẩm, tùy chỉnh thiết kế, giữ giỏ trên thiết bị và đặt đơn | Liệt kê đơn, đọc snapshot hoặc ảnh riêng của đơn |
| Người có mã đơn + SĐT người nhận | Xem trạng thái, thời gian, lịch sử trạng thái và mã vận đơn | Xem tên, SĐT, địa chỉ, thiết kế, ảnh, ghi chú hoặc URL nhạc |
| Admin sau gate | Xem danh sách/chi tiết đơn, ảnh riêng, cập nhật trạng thái, quản lý sản phẩm, xem thống kê và xuất CSV | Sửa snapshot giá/thiết kế đã chốt trong đơn |

Ứng dụng không có bảng user/session, cookie phiên, trang đăng nhập hoặc API auth. Admin không có login bên trong app. `ADMIN_ENABLED` mặc định false trong production và true ở môi trường khác. Khi bật ở production, người vận hành phải bảo vệ `/admin*` và `/api/admin*` tại reverse proxy. Khi gate tắt, các đường dẫn này trả 404 chung.

## Yêu cầu chức năng

### FR-01 — Xem và tùy chỉnh sản phẩm

- Khách xem một sản phẩm và mẫu hiện hành, tạo nhiều thiết kế trong giỏ, sửa từng dòng và điều chỉnh số bản.
- Trình duyệt lưu trạng thái giỏ/ảnh theo quyết định D5. Không đưa Blob ảnh vào localStorage.
- Giá cuối cùng luôn được tính từ sản phẩm trong DB, không nhận giá từ client.

### FR-02 — Đặt hàng không cần tài khoản

- Server xác thực sản phẩm, mẫu, người nhận, ảnh đã decode, giới hạn tài nguyên và nội dung thiết kế.
- Server lưu snapshot người nhận/sản phẩm/thiết kế, dòng hàng và sự kiện trạng thái đầu trong cùng transaction.
- `requestKey` giữ nguyên khi kết quả request chưa rõ để không tạo đơn trùng. Response thành công trả `orderNumber`, không trả token tra cứu.
- Trang thành công hiển thị rõ mã đơn, cho sao chép, và hướng dẫn tra cứu tại `/track` bằng mã đơn + SĐT đã nhập.

### FR-03 — Tra cứu riêng tư bằng mã đơn + SĐT

- Chuẩn hóa số điện thoại bằng cùng một hàm lúc tạo đơn và tra cứu: bỏ khoảng trắng, dấu chấm, dấu gạch; `+84` hoặc `84` đầu chuỗi đổi thành `0`; kết quả phải khớp `^0[0-9]{9,10}$`.
- DB lưu HMAC-SHA256 của SĐT chuẩn hóa với secret `LOOKUP_SECRET`; không lưu thêm SĐT thô ngoài snapshot người nhận phục vụ giao hàng.
- `POST /api/tracking/lookup` nhận `{ orderNumber, phone }` trong body. Không đưa mã đơn/SĐT lên URL hoặc log.
- So sánh hash bằng `timingSafeEqual`. Sai mã, sai SĐT hoặc định dạng mã không hợp lệ đều trả cùng lỗi 404.
- Giới hạn 5 lần thử sai trên mỗi mã đơn và 20 lần thử sai trên mỗi IP trong 15 phút; vượt giới hạn trả 429 và `Retry-After`. Bộ đếm memory phù hợp một instance.
- Public response chỉ gồm mã đơn, trạng thái, thời gian tạo/cập nhật, lịch sử trạng thái và mã vận đơn.

### FR-04 — Admin sau gate

- `/admin` mở danh sách đơn trực tiếp khi gate bật; không có trang login, session hay logout.
- API admin giữ danh sách, chi tiết, ảnh riêng, state machine và `expectedVersion`.
- Menu admin có đơn hàng, sản phẩm và thống kê; tìm đơn bằng mã chính xác/tiền tố, tải CSV, chỉnh giá/mô tả/trạng thái sản phẩm và xem thống kê theo ngày Việt Nam.
- Mỗi lần đổi giá ghi `product_price_history` cùng transaction với cập nhật sản phẩm. Version cũ trả 409; snapshot của đơn cũ không thay đổi.
- Sản phẩm tắt vẫn hiển thị trạng thái ngừng nhận trên storefront; server từ chối tạo đơn với `PRODUCT_INACTIVE`.
- Chuyển trạng thái và thêm event cùng transaction; actor được ghi là `admin`.
- Gate bị tắt thì `/api/admin*` trả JSON 404 chung, `/admin*` trả trang 404. Production mặc định tắt; khi bật phải có reverse proxy bảo vệ trước.
- Không phục vụ `storage/uploads` trực tiếp hoặc dùng link công khai cho ảnh.

### FR-05 — State machine

| Hiện tại | Trạng thái kế tiếp |
|---|---|
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `producing`, `cancelled` |
| `producing` | `shipping` |
| `shipping` | `completed` |
| `completed`, `cancelled` | Không có |

Hủy đơn cần lý do nội bộ. Chuyển trạng thái cần đúng `expectedVersion`; version cũ trả 409. Không ghi lý do hủy vào public response.

## Yêu cầu phi chức năng

- Stack: React/TypeScript/Vite, Express/TypeScript, MySQL 8.4 qua `mysql2`; không thêm ORM, framework hoặc router mới.
- SQL có tham số, transaction qua adapter `apps/api/src/db.ts`; migration đã áp dụng không được sửa nội dung.
- Không log SĐT, địa chỉ, body đặt hàng, URL nhạc, secret hoặc cookie. `LOOKUP_SECRET` production phải có ít nhất 32 byte; thiếu thì API từ chối khởi động.
- Tệp phải được decode thật, có giới hạn loại ảnh/kích thước/độ phân giải/bộ nhớ. UI validation không thay backend.
- Test nghiệp vụ tạo đơn, lookup, admin gate và state machine chạy trên MySQL thật ở DB thử riêng.

## Ngoài phạm vi hiện tại

Đăng nhập/tài khoản, email, nhiều sản phẩm, thanh toán, S3, triển khai cloud và thay đổi cấu hình server không thuộc R1. Thanh toán VietQR và S3 chỉ thực hiện nếu người dùng hoặc người vận hành chọn task tùy chọn tương ứng.
