# Kế hoạch một người — demo Harméa ngày 28/10/2026

Mục tiêu của kế hoạch là hoàn thành một luồng có dữ liệu thật: khách tạo thiết kế → gửi đơn → quản trị viên xử lý → khách thấy trạng thái mới. Khung dự án và các hợp đồng trong bộ tài liệu là điểm bắt đầu; danh sách dưới đây **không phải các chức năng đã triển khai**. Xem trạng thái thực tế ở `README.md`.

Ước lượng **8–10 giờ tập trung**, phụ thuộc tốc độ tích hợp và lỗi phát sinh; không phải cam kết hoàn thành. Chưa có giờ demo cụ thể. Nếu thời gian còn ít hơn, giảm trang trí và thao tác phụ, giữ các điều kiện nghiệm thu cốt lõi.

## Phạm vi cố định đến buổi demo

- Một sản phẩm, một phiên bản mẫu thẻ; chữ ký nhập bằng chữ.
- Một đơn có 1–10 thiết kế cùng mẫu, mỗi dòng 1–10 bản giống nhau, tổng 1–100 thẻ (quyết định 29/10/2026).
- Khách không đăng ký tài khoản; giữ giỏ hàng, không thanh toán.
- Khách xem trước, xác nhận và gửi đơn; nội dung đơn đã gửi không sửa trực tiếp.
- Một quản trị viên đăng nhập để xem đơn, ảnh, URL nhạc và cập nhật trạng thái.
- Khách dùng liên kết bí mật để tra cứu tiến độ; trang này không trả thông tin cá nhân hoặc ảnh.
- Tiền hàng = đơn giá phía máy chủ × số lượng. Phí giao hàng chưa bao gồm, được xác nhận ngoài hệ thống.
- Chạy PostgreSQL bằng Docker Compose nếu Docker đã sẵn sàng; PGlite lưu bền tại `storage/db` là chế độ dự phòng. Hai chế độ dùng chung SQL nhưng dữ liệu riêng. Chưa cần triển khai cloud.

## Thứ tự làm và giới hạn thời gian

| Bước | Thời lượng dự kiến | Kết quả bắt buộc để chuyển bước |
|---|---:|---|
| Chuẩn bị | 30 phút | Chạy khung dự án, migration/seed và health; biết rõ các API nào còn chưa được viết |
| A — API và dữ liệu | 2,5 giờ | Tạo được đơn bằng request mẫu; đăng nhập admin; cập nhật trạng thái; tra cứu thấy trạng thái mới; dữ liệu còn sau khi khởi động lại |
| B — Thiết kế thẻ | 2 giờ | Một mẫu có ảnh/chữ, xem trước và xuất PNG; nhận đủ cấu hình để gửi đơn |
| C — Đặt và tra cứu đơn | 1,5 giờ | Gửi đơn từ trình duyệt, nhận liên kết riêng, mở lại trang tra cứu |
| D — Quản trị và tích hợp | 1 giờ | Admin xem đơn mới, mở ảnh/preview riêng tư, chuyển trạng thái hợp lệ |
| Diễn tập và sửa lỗi | 0,5–2,5 giờ | Chạy checklist nghiệm thu, sửa lỗi cản luồng, chuẩn bị dữ liệu demo không chứa thông tin thật |

Tổng dự kiến: **8–10 giờ**. Hoàn thành từng bước rồi chuyển tiếp; một người không cần chia nhiều nhánh hoặc mở nhiều việc dang dở.

## Làm một luồng hoàn chỉnh trước

Ngay trong bước A, dùng request mẫu và ảnh thử để chứng minh API–database–tracking hoạt động. Khi có màn hình thiết kế ở bước B, nối trực tiếp vào luồng đó. Không chờ hoàn thiện nhận diện, trang chủ hay toàn bộ form mới thử tạo đơn.

Sau mỗi bước, tạo một commit với phần đã chạy được và ghi ngắn cách kiểm tra. Đọc `contracts/openapi.json` trước khi nối frontend/backend; không tự đổi tên trường hoặc trạng thái ở một phía.

## Bốn đầu việc có thể giao lần lượt

| Thứ tự | Phiếu công việc | Phụ thuộc |
|---|---|---|
| A | [API, dữ liệu và quyền truy cập](../tasks/A-api-data.md) | Khung dự án, schema và hợp đồng API |
| B | [Cá nhân hóa và bản xem trước](../tasks/B-card-editor.md) | Hợp đồng dữ liệu; có thể dùng fixture sản phẩm đúng hợp đồng trong lúc A chưa xong |
| C | [Đặt hàng và tra cứu](../tasks/C-checkout-tracking.md) | A và đầu ra B |
| D | [Quản trị, tích hợp và diễn tập](../tasks/D-admin-demo.md) | A; nghiệm thu toàn luồng cần B và C |

Mỗi phiếu có prompt để đưa cho một coding agent hoặc dùng làm checklist tự viết. Không chạy đồng thời các prompt trên cùng file. Agent được giao một phiếu vẫn phải đọc hợp đồng và kiểm tra mã hiện có trước khi sửa.

## Quy tắc dừng để kịp demo

**Phải sửa trước buổi demo:** không tạo được đơn, mất dữ liệu, lưu sai thiết kế/giá, tracking không cập nhật, người chưa đăng nhập đọc được dữ liệu admin, lộ ảnh/thông tin khách, hoặc chuyển trạng thái sai.

**Có thể để sau:** tinh chỉnh màu/font, animation, nhiều mẫu, chữ ký vẽ tay, tự động xuất file in, đăng nhập khách, thanh toán, vận chuyển thật, thông báo email/SMS và cloud. Không cắt việc xác nhận nội dung, validation phía máy chủ hay lưu dữ liệu để đổi lấy trang trí.

Nếu chưa hoàn tất một chức năng, ghi rõ giới hạn trong demo; không thay dữ liệu tĩnh rồi giới thiệu là thao tác đã được lưu vào hệ thống.

## Kịch bản trình bày 5–7 phút

1. Giới thiệu Harméa là thẻ NFC cá nhân hóa; nêu phạm vi demo không có thanh toán.
2. Chọn ảnh mẫu, nhập thông tin hư cấu và URL nhạc, xem trước thiết kế.
3. Đặt hai bản cùng thiết kế; chỉ rõ tiền hàng chưa gồm phí giao hàng.
4. Mở liên kết theo dõi, thấy trạng thái chờ xác nhận.
5. Đăng nhập admin; đối chiếu thiết kế, URL nhạc và người nhận; xác nhận rồi chuyển sang sản xuất.
6. Quay lại trang khách, làm mới và thấy trạng thái mới.
7. Nêu phần sẽ bổ sung sau: thanh toán, nhiều mẫu, chuẩn bị file in, vận chuyển.

Chạy kiểm tra khởi động lại và các trường hợp lỗi trước buổi trình bày theo `docs/04-acceptance-demo.md`; không cần kéo dài phần trình bày chính. Chỉ demo chạm NFC nếu có thẻ và điện thoại phù hợp. Bấm một URL trên web không chứng minh phần cứng NFC đã được kiểm tra.

## Tài liệu cần đọc trước khi viết

1. `docs/01-requirements.md` — phạm vi, quy tắc và tiêu chí chấp nhận.
2. `docs/02-architecture.md` — cấu trúc ứng dụng và môi trường local.
3. `docs/03-data-api.md` cùng `contracts/openapi.json` — tên trường, trạng thái và hợp đồng.
4. `docs/04-acceptance-demo.md` — điều kiện kết thúc và minh chứng.

Nguồn nghiệp vụ: [EBU Final — Harméa](https://docs.google.com/document/d/1vIQdKgMkv1hKGRpBblwSZPTJAblv0cM0KJ3A50FuqwU/edit?tab=t.qk61u038y7hh). Thứ tự công việc, thời lượng và các rút gọn ở đây là đề xuất phục vụ hạn demo, không phải nội dung đã được kiểm chứng trong tài liệu sản phẩm.
