# Harméa MVP — nghiệm thu và kịch bản demo

Mốc dự kiến: 28/10/2026. Tài liệu này là checklist thực hiện; mọi mục bên dưới khởi tạo ở trạng thái **chưa chạy**, không phải báo cáo đạt kiểm thử.

Cập nhật 29/10/2026: API task A đã có integration tests riêng; xem docs/qa/2026-10-29-task-a.md. Checklist UI bên dưới vẫn chưa chạy. Phạm vi giữ giỏ: 1–10 thiết kế cùng mẫu, mỗi dòng 1–10 bản; kiểm tra thêm một đơn có hai thiết kế và ảnh/preview riêng từng dòng.

Chức năng nghiệp vụ phải được triển khai trước khi chạy checklist. Khung dự án chỉ khởi động/build được không đồng nghĩa với MVP đã hoàn thành.

## 1. Dữ liệu và chuẩn bị

- Dùng ảnh và thông tin giả có quyền sử dụng; không lấy dữ liệu khách thật để demo.
- Sản phẩm seed: Harméa NFC Music Card; **giá demo 50.000 VND**, không phải giá thương mại đã xác nhận.
- Tạo thiết kế tên `DEMO HARMEA`, chữ ký dạng văn bản, ngày hợp lệ, địa điểm `Ha Noi` và một URL HTTPS phù hợp hợp đồng.
- Người nhận: `Khach Demo`; số điện thoại và địa chỉ giả nhưng đúng định dạng hợp đồng. Nói rõ đây là dữ liệu thử nghiệm.
- Chuẩn bị ảnh JPEG/PNG dưới 5 MiB, một tệp văn bản đổi đuôi `.png`, một ảnh vượt giới hạn, và một ảnh thứ hai để kiểm tra thay đổi thiết kế.
- Có tài khoản quản trị local đã cấu hình; không chiếu mật khẩu hoặc token trong terminal.
- Mở cửa sổ khách và cửa sổ quản trị riêng. Giữ sẵn link tracking sau khi tạo đơn, vì P0 không có tài khoản khách để khôi phục link mất.

## 2. Kịch bản trình diễn 5–7 phút

Thời lượng là gợi ý để tập trước, không phải thời gian đã đo.

| Bước | Thao tác | Kết quả cần nhìn thấy |
| --- | --- | --- |
| 1 | Giới thiệu sản phẩm | Thẻ NFC cá nhân hóa; chạm mở liên kết, không hứa tự phát nhạc |
| 2 | Chọn ảnh, nhập thông tin và URL nhạc | Preview thay đổi theo nội dung; chữ ký dạng văn bản |
| 3 | Chọn số lượng 2, kiểm tra thiết kế và thông tin người nhận | Tiền hàng là 100.000 VND với seed demo; phí giao hàng chưa bao gồm; chưa có thanh toán |
| 4 | Gửi đơn một lần | Có mã đơn, trạng thái chờ xác nhận và link theo dõi riêng |
| 5 | Đăng nhập quản trị, mở đơn vừa tạo | Đúng thông tin người nhận, số lượng, thiết kế, URL, ảnh gốc và preview |
| 6 | Cập nhật tuần tự confirmed → producing → shipping → completed | Lịch sử đúng thứ tự; không gọi API nhảy thẳng từ pending sang completed |
| 7 | Tải lại trang theo dõi ở cửa sổ khách | Tiến độ mới xuất hiện; không lộ thông tin người nhận, ảnh hoặc URL nhạc |

Nếu có thẻ NFC thật đã được ghi, có thể trình diễn riêng việc chạm thẻ. Nếu không có thiết bị/thẻ phù hợp, chỉ mô tả quy trình phần cứng; không gọi thao tác mở link bằng chuột là kiểm thử NFC.

## 3. Checklist bắt buộc trước buổi demo

Điền kết quả sau khi chạy; dùng `Đạt`, `Không đạt` hoặc `Chưa chạy`, kèm mã đơn hoặc tên bằng chứng. Không ghi token thật, mật khẩu hoặc thông tin khách thật vào tài liệu.

| ID | Tham chiếu | Kiểm tra | Kết quả mong đợi | Trạng thái |
| --- | --- | --- | --- | --- |
| AT-01 | FR-01–03 | Nhập dữ liệu và đổi ảnh trước khi đặt | Preview cập nhật đúng nội dung; còn theo một template cố định | Chưa chạy |
| AT-02 | FR-04 | Bỏ trống trường bắt buộc; sửa lại | Có thông báo ở trường lỗi; chưa tạo đơn; dữ liệu hợp lệ còn nguyên | Chưa chạy |
| AT-03 | FR-05 | Đặt 2 chiếc với seed 50.000 VND | Đúng một đơn; subtotalVnd=100000, shippingFeeVnd=null; trang nói rõ phí giao hàng chưa bao gồm; trạng thái pending; nhận link tracking | Chưa chạy |
| AT-04 | FR-05 | Sửa giá/tổng tiền trong request bằng DevTools | Backend không tin giá client; dùng giá sản phẩm từ database hoặc từ chối field ngoài hợp đồng | Chưa chạy |
| AT-05 | FR-05 | Thay giá danh mục sau khi có đơn | Giá và thiết kế của đơn đã tạo không đổi | Chưa chạy |
| AT-06 | FR-06 | Gửi lại cùng requestKey | Trả 409; số đơn trong database vẫn là một | Chưa chạy |
| AT-07 | FR-07 | Tra cứu token hợp lệ và token sai | Token hợp lệ trả dữ liệu công khai; token sai trả lỗi chung, không lộ đơn khác | Chưa chạy |
| AT-08 | FR-07 | Kiểm tra JSON tracking và trang khách | Không có tên, điện thoại, địa chỉ, ảnh, thiết kế, URL nhạc, lý do hủy nội bộ hoặc người thao tác | Chưa chạy |
| AT-09 | FR-08 | Gọi trực tiếp API admin/tải ảnh khi chưa login; thử sau logout | Bị từ chối ở backend, không trả dữ liệu hoặc tệp | Chưa chạy |
| AT-10 | FR-08 | Login đúng, mở đơn và tệp | Xem được đơn mới cùng đúng ảnh gốc, preview và cấu hình | Chưa chạy |
| AT-11 | FR-09 | Chuyển tuần tự các trạng thái hợp lệ | Trạng thái hiện tại và lịch sử khớp; tracking phản ánh sau khi tải lại | Chưa chạy |
| AT-12 | FR-09 | pending → completed; completed → producing | Bị từ chối; trạng thái/lịch sử không bị thay đổi | Chưa chạy |
| AT-13 | FR-09 | Hủy đơn pending/confirmed có và không có lý do | Thiếu lý do bị từ chối; có lý do thành cancelled; không mở lại được | Chưa chạy |
| AT-14 | FR-10 | Gửi tệp giả ảnh, sai loại, quá dung lượng hoặc quá kích thước | Backend từ chối; không có đơn dở; không lưu tệp public | Chưa chạy |
| AT-15 | FR-10 | Tạo đơn, tắt ứng dụng, chạy lại | Đơn, lịch sử và preview còn nguyên | Chưa chạy |
| AT-16 | NFR-05 | Chạy luồng chính ở 390 px và desktop | Các trường và nút chính truy cập được, không tràn ngang cản thao tác | Chưa chạy |
| AT-17 | NFR-06 | Nhập URL javascript và chuỗi HTML vào trường chữ | URL bị từ chối; chuỗi chữ không thực thi mã; backend không tải URL nhạc | Chưa chạy |
| AT-18 | FR-06 | Mô phỏng mất response sau khi server đã tạo đơn, retry cùng khóa | Không tạo đơn thứ hai; giao diện thông báo cần cửa hàng kiểm tra, không tự tuyên bố lấy lại được link | Chưa chạy |
| AT-19 | FR-09 | Hai tab admin gửi cùng expectedVersion | Chỉ một lần cập nhật thành công; lần còn lại 409; không thêm event thứ hai cho version đó | Chưa chạy |
| AT-20 | NFR-03 | Ép lỗi insert event trong transaction tạo/cập nhật đơn | Rollback dữ liệu DB tương ứng; không để status mới thiếu lịch sử; file mới của lần tạo thất bại được dọn | Chưa chạy |

Kiểm tra AT-04, AT-06, AT-09 và AT-12 bằng gọi API trực tiếp, không chỉ bằng việc nút bị ẩn/khóa trên giao diện. Định dạng request/response và HTTP status chính xác xem `contracts/openapi.json`.

## 4. Tiêu chí kết thúc MVP

- Toàn bộ vòng khách đặt → admin xử lý → khách theo dõi chạy trên cùng dữ liệu thật của ứng dụng.
- Các kiểm tra quyền, dữ liệu, trạng thái và restart ở bảng trên đạt; mục chưa đạt được sửa hoặc báo rõ là hạn chế trước khi demo.
- Frontend và backend build/typecheck thành công bằng các lệnh được README hướng dẫn.
- Có ít nhất một đơn hoàn tất và một đơn hủy dùng dữ liệu giả để trình bày, nhưng vẫn tạo được đơn mới trực tiếp khi demo.
- Không có nút thanh toán giả thành công, dữ liệu admin giả cứng hoặc tracking trả cùng kết quả cho mọi mã mà không được ghi rõ là mock.
- Phân biệt rõ việc ứng dụng ghi nhận sản xuất/giao hàng với bằng chứng sản phẩm vật lý đã thực sự được thực hiện.

## 5. Khi sắp hết thời gian

Giữ các phần: dữ liệu cá nhân hóa, tạo đơn, lưu bền vững, đăng nhập admin, cập nhật trạng thái đúng, tracking không lộ dữ liệu riêng.

Cắt trước: trang trí thương hiệu cầu kỳ, hiệu ứng, ảnh giới thiệu phụ, filter nâng cao, email, PDF, chữ ký vẽ, thêm mẫu, tự động phí giao hàng, thanh toán và tích hợp vận chuyển. Không lách lỗi phân quyền bằng cách bỏ đăng nhập, hoặc lách lỗi database bằng cách giả vờ dữ liệu trong bộ nhớ là đã lưu bền vững.

## 6. Phiếu ghi nhận ngắn sau khi kiểm thử

```text
Ngày/giờ:
Phiên bản / commit (nếu có):
Môi trường Node và database:
Lệnh build/typecheck:
Kết quả các AT:
Mã đơn demo (không ghi token):
Lỗi còn lại:
Phần mô phỏng / chưa làm:
Đường dẫn ảnh hoặc video bằng chứng:
```

Giữ bằng chứng trong thư mục làm việc local, không đưa PII/token vào Git. Báo cáo kết quả đo được, không đánh dấu đạt dựa trên việc đã đọc code.
