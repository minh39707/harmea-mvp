# Harméa MVP — yêu cầu và phạm vi

Ngày lập: 27/10/2026 · Mốc demo: 28/10/2026 · Nhân lực: 1 người.

Đây là đặc tả để triển khai. Các chức năng bên dưới chưa được coi là đã làm hoặc đã kiểm thử chỉ vì tài liệu tồn tại. Xem README của dự án để biết trạng thái thực tế của khung mã nguồn.

## 1. Mục tiêu demo

Khách cá nhân hóa một thẻ Harméa, xem trước, gửi đơn và nhận liên kết theo dõi. Quản trị viên đăng nhập, nhận đúng thiết kế cùng thông tin nhận hàng, cập nhật tiến độ; khách thấy trạng thái mới. Đơn và tệp phải còn sau khi khởi động lại ứng dụng.

**Không có thanh toán trong MVP.** Gửi đơn chỉ tạo yêu cầu đặt hàng; không có nghĩa là khách đã trả tiền hoặc cửa hàng đã chấp nhận đơn.

## 2. Cơ sở sản phẩm và quyết định phạm vi

Nguồn sản phẩm: [EBU Final — Product Description & USP](https://docs.google.com/document/d/1vIQdKgMkv1hKGRpBblwSZPTJAblv0cM0KJ3A50FuqwU/edit?tab=t.qk61u038y7hh), đã được đọc trong cuộc trao đổi ngày 27/10/2026.

| Nội dung | Cơ sở / trạng thái |
| --- | --- |
| Harméa NFC Music Card là thẻ nhựa cá nhân hóa gắn NFC | Theo tài liệu sản phẩm |
| Thẻ 54 × 86 mm, artwork 57 × 90 mm, vùng an toàn 49 × 82 mm | Theo tài liệu sản phẩm; cần đối chiếu nhà in trước khi sản xuất thật |
| Nội dung gồm ảnh, tên, ngày sinh, địa điểm, ngày, chữ ký và URL bài hát/playlist | Theo tài liệu sản phẩm |
| Chạm NFC mở liên kết, không bảo đảm tự phát nhạc | Theo tài liệu sản phẩm |
| Nhóm đã thử ghi lại URL trên thẻ mẫu bằng NFC Tools | Kết quả được tài liệu ghi nhận; chưa kiểm thử phần cứng trong công việc này |
| Nhóm khách 18–25 tuổi, giá trị cảm xúc, nhu cầu mua và mức sẵn sàng trả tiền | Giả thuyết trong tài liệu, chưa phải kết luận khảo sát |
| Có đặt hàng và theo dõi đơn; chưa cần thanh toán | Người dùng đã xác nhận |
| Một người thực hiện, demo ngày 28/10/2026 | Người dùng đã xác nhận |
| React + TypeScript, Node.js/Express và PostgreSQL | Người dùng đã chấp nhận phương án mặc định |
| Một sản phẩm, một mẫu cố định, một thiết kế trong mỗi đơn | Quyết định triển khai đề xuất để kịp demo |
| Chữ ký là văn bản có kiểu chữ ký; chưa vẽ bằng chuột/cảm ứng | Đơn giản hóa đề xuất cho bản đầu |
| Khách không đăng nhập, không có giỏ hàng | Đơn giản hóa đề xuất cho bản đầu |

Một đơn có số lượng từ 1 đến 10; mọi chiếc trong đơn dùng cùng một thiết kế và URL nhạc. Muốn hai thiết kế khác nhau thì tạo hai đơn. Các tham số này có thể đổi sau demo nhưng phải đổi hợp đồng API và kiểm thử cùng lúc.

Người dùng có thể chạy Docker. Khung dự án kèm Docker Compose PostgreSQL và cấu hình `DB_DRIVER=postgres`/`DATABASE_URL`. PGlite lưu đĩa là phương án local dự phòng, mặc định trong `.env.example` để kiểm tra nhanh khi Docker chưa sẵn sàng. Hai driver dùng chung SQL nhưng dữ liệu riêng; không suy ra đã nghiệm thu production hoặc nhiều phiên cùng ghi.

## 3. Vai trò và quyền

| Vai trò | Được phép | Không được phép |
| --- | --- | --- |
| Khách chưa đăng nhập | Xem sản phẩm, cá nhân hóa, đặt đơn, tra cứu bằng liên kết riêng | Liệt kê đơn; xem ảnh, địa chỉ hoặc URL nhạc của người khác; đổi trạng thái đơn |
| Người có liên kết theo dõi | Xem mã đơn, trạng thái, thời gian, tiến độ và thông tin vận chuyển được phép công khai | Xem thông tin người nhận, ảnh, thiết kế, URL nhạc hoặc ghi chú nội bộ |
| Quản trị viên | Đăng nhập, xem danh sách/chi tiết đơn, xem và tải tệp của đơn, cập nhật tiến độ | Sửa âm thầm thiết kế hoặc giá đã chốt trong đơn |

Liên kết theo dõi là một bí mật truy cập. Bất kỳ ai có liên kết đều có thể thấy tiến độ công khai của đơn; nó không thay thế việc đăng nhập cho quyền quản trị.

## 4. Yêu cầu P0 — phải có để demo

Giới hạn trường, tên trường JSON, định dạng lỗi và đường dẫn API lấy từ `contracts/openapi.json`. Nếu phát hiện tài liệu này mâu thuẫn hợp đồng, dừng phần bị ảnh hưởng và sửa hai nơi trước khi triển khai tiếp.

### FR-01 — Xem sản phẩm

- Hiển thị một sản phẩm Harméa, giá VND, mô tả ngắn và cách NFC hoạt động.
- Lấy giá từ backend; không dùng giá cố định trong frontend để tạo đơn.
- Dữ liệu seed **50.000 VND chỉ là giá giả phục vụ demo**, không phải giá kinh doanh đã được xác nhận.
- Nghiệm thu: tải trang thấy sản phẩm; tổng tiền sản phẩm thay đổi theo số lượng; nội dung không nói thẻ tự phát nhạc.

### FR-02 — Cá nhân hóa một mẫu thẻ

- Nhập các trường thiết kế theo hợp đồng; chọn ảnh và nhập URL nhạc.
- Tên trường thống nhất: `fullName`, `dateOfBirth`, `place`, `commemorativeDate`, `signatureText`, `musicUrl` và `crop`. Ngày dùng `YYYY-MM-DD`; ngày sinh không được ở tương lai. Crop dùng tọa độ chuẩn hóa trong ảnh; không cho vùng crop vượt biên.
- Dùng một template có mã và phiên bản xác định. Bản đầu có chữ ký dạng văn bản.
- Kiểm tra ở frontend để hỗ trợ người dùng, đồng thời kiểm tra lại ở backend.
- Nghiệm thu: sửa trường hoặc ảnh làm thay đổi phần xem trước; dữ liệu thiếu hoặc sai không tạo được đơn.

### FR-03 — Xem trước và xác nhận thiết kế

- Khách xem bản xem trước và xác nhận trước khi gửi đơn.
- Giữ bố cục theo tỷ lệ artwork 57:90 và đánh dấu vùng an toàn trong logic dựng mẫu; không thêm trình kéo thả tự do.
- Lưu preview PNG, ảnh gốc và cấu hình thiết kế của đơn.
- Nghiệm thu: quản trị viên mở được đúng preview của đơn và các dữ liệu nguồn tương ứng.
- Preview là bằng chứng trực quan để đối chiếu, **chưa được cam kết là file in đạt chuẩn**. Không quảng cáo độ chính xác màu, DPI hoặc bleed khi chưa kiểm tra với nhà in. File preview do client gửi cũng cần được người xử lý đối chiếu với dữ liệu thiết kế trước khi sản xuất thật.

### FR-04 — Nhập thông tin nhận hàng

- Thu thập tên người nhận, số điện thoại, địa chỉ và ghi chú tùy chọn.
- Hiển thị lại số lượng, giá và thông tin người nhận để khách kiểm tra.
- Nghiệm thu: trường bắt buộc hoặc dữ liệu sai định dạng báo lỗi rõ; không làm mất các nội dung hợp lệ mà khách đã nhập khi sửa lỗi.

### FR-05 — Tạo đơn và lưu thông tin đã chốt

- Gửi một request multipart gồm JSON đơn hàng, ảnh gốc và preview; không xây hệ thống bản nháp tải ảnh riêng trong P0.
- Backend kiểm tra sản phẩm, template/phiên bản, số lượng và dữ liệu; tính tổng tiền sản phẩm bằng đơn giá phía server × số lượng, với số nguyên VND.
- Gọi số tiền này là `subtotalVnd`, không gọi là tổng thanh toán cuối cùng. `shippingFeeVnd` là `null`; màn hình ghi rõ chưa bao gồm phí giao hàng và cửa hàng sẽ xác nhận ngoài hệ thống. Không biến phí chưa biết thành miễn phí.
- Lưu thông tin sản phẩm, đơn giá, template, cấu hình, URL nhạc và địa chỉ tại thời điểm đặt. Đơn sau khi tạo không bị thay đổi bởi việc sửa danh mục.
- Tạo đơn ở `pending`; trả mã đơn và token theo dõi sau khi lưu thành công.
- Nghiệm thu: request hợp lệ tạo đúng một đơn; request không hợp lệ không để lại đơn thiếu dữ liệu hoặc tệp bị công khai.

### FR-06 — Hạn chế gửi trùng đơn

- Frontend tạo `requestKey` UUID cho một lần gửi, giữ nguyên khóa khi retry cùng lần gửi và khóa nút trong lúc chờ.
- Backend có ràng buộc duy nhất cho `requestKey`; request lặp trả `409`, không chèn thêm đơn.
- Nghiệm thu: gửi cùng khóa hai lần chỉ có một dòng đơn trong database.
- Giới hạn đã biết: đây chưa phải cơ chế phát lại đầy đủ response. Nếu request đầu đã lưu nhưng response bị mất, bản đầu hiển thị hướng dẫn liên hệ cửa hàng để kiểm tra; không giả vờ đã khôi phục được liên kết và không tự tạo đơn mới bằng khóa khác.

### FR-07 — Theo dõi đơn bằng liên kết riêng

- Backend sinh token ngẫu nhiên 32 byte; chỉ lưu SHA-256 của token trong database.
- Link khách nhận có dạng `/track#token`; frontend lấy token từ fragment và gửi trong body đến API tra cứu. Không đặt token trong query string, URL API, log, analytics hoặc console.
- Trang theo dõi chỉ hiển thị dữ liệu công khai được nêu ở mục quyền. Không có chức năng tìm đơn bằng mã tăng dần hoặc số điện thoại.
- Nghiệm thu: token hợp lệ xem được tiến độ; token sai trả lỗi chung; response và trang không chứa PII, ảnh, thiết kế hoặc URL nhạc.

### FR-08 — Đăng nhập quản trị và xem đơn

- Một tài khoản quản trị được cấu hình cho demo, không có đăng ký công khai.
- Mọi API quản trị và API tải tệp phải xác thực phía backend; ẩn nút trên frontend không đủ.
- Danh sách hỗ trợ lọc trạng thái; chi tiết có dữ liệu nhận hàng, thiết kế, URL nhạc và lịch sử trạng thái.
- Nghiệm thu: chưa đăng nhập bị từ chối khi gọi API trực tiếp; đăng nhập đúng mở được chi tiết và tệp; đăng xuất khiến phiên không còn dùng được.

### FR-09 — Cập nhật tiến độ có kiểm soát

- Chỉ cho phép các bước ở mục 5; ghi thời điểm và trạng thái trước/sau trong cùng transaction với việc cập nhật đơn.
- Khi chuyển `cancelled`, quản trị viên phải nhập lý do. Nội dung nội bộ không được đưa nguyên văn vào API tra cứu công khai.
- Có thể nhập mã vận đơn khi giao; không cần tích hợp hãng vận chuyển hoặc tự tra cứu trạng thái.
- Nghiệm thu: gọi API bỏ qua bước hoặc sửa đơn đã hoàn tất bị từ chối; cập nhật hợp lệ xuất hiện trong lịch sử và trang theo dõi sau khi tải lại.

### FR-10 — Xử lý tệp và duy trì dữ liệu

- Ảnh gốc: JPEG/PNG, tối đa 5 MiB. Preview: PNG, tối đa 2 MiB.
- Backend kiểm tra nội dung tệp bằng giải mã ảnh, tối đa 20 megapixel và cạnh dài nhất 8192 pixel; không chỉ tin phần mở rộng hoặc MIME do trình duyệt gửi.
- Tệp nằm ngoài thư mục public; tên lưu do server tạo. Không cho client điều khiển đường dẫn filesystem.
- Lưu trên đĩa/database bền vững; dọn tệp tạm khi tạo đơn thất bại. Việc khởi động lại không xóa dữ liệu demo.
- Nghiệm thu: tệp giả ảnh/quá giới hạn bị từ chối; truy cập trực tiếp đường dẫn tệp không đọc được; restart vẫn xem được đơn và preview qua tài khoản quản trị.

## 5. Trạng thái và quy tắc chuyển

| Từ | Được chuyển đến | Điều kiện nghiệp vụ |
| --- | --- | --- |
| `pending` — Chờ xác nhận | `confirmed`, `cancelled` | Quản trị viên kiểm tra nội dung; hủy cần lý do |
| `confirmed` — Đã xác nhận | `producing`, `cancelled` | Bắt đầu sản xuất hoặc hủy trước sản xuất |
| `producing` — Đang sản xuất | `shipping` | Đã hoàn thành và kiểm tra sản phẩm/NFC ngoài hệ thống |
| `shipping` — Đang giao | `completed` | Quản trị viên ghi nhận giao thành công |
| `completed` — Hoàn tất | Không có | Trạng thái cuối |
| `cancelled` — Đã hủy | Không có | Trạng thái cuối |

Không có trạng thái thanh toán. Không có thao tác quay lùi, mở lại đơn hoặc khách tự hủy trong P0. Website lưu ghi nhận của người quản trị; không tự chứng minh thẻ vật lý đã được in, ghi NFC hoặc giao thành công.

## 6. Điều kiện chất lượng tối thiểu

| Mã | Điều kiện | Cách chứng minh |
| --- | --- | --- |
| NFR-01 | Phân quyền ở backend | Gọi trực tiếp API quản trị/tệp khi chưa đăng nhập bị từ chối |
| NFR-02 | Không lộ dữ liệu qua tracking | Kiểm tra JSON và trang công khai không chứa trường nhạy cảm |
| NFR-03 | Ghi đơn và trạng thái nhất quán | Request lỗi không tạo đơn dở; status và history cập nhật cùng nhau |
| NFR-04 | Dữ liệu bền vững | Tạo đơn, dừng và chạy lại ứng dụng, đọc lại đúng dữ liệu |
| NFR-05 | Luồng chính dùng được trên điện thoại | Kiểm tra ở chiều rộng 390 px và desktop; không bị che nút gửi đơn |
| NFR-06 | Bảo vệ bí mật và nội dung nhập | Không đưa mật khẩu/token vào Git hoặc log; escape text, từ chối URL sai giao thức; backend không tự tải URL nhạc |

Mục tiêu của vòng này là một bản demo local có luồng hoàn chỉnh. Chưa có số đo tải đồng thời, cam kết uptime hoặc nghiệm thu bảo mật cho dịch vụ public.

URL nhạc chỉ nhận HTTPS, không có thông tin đăng nhập hoặc cổng tùy chỉnh, và host thuộc allowlist trong OpenAPI. Kiểm tra hostname sau khi parse URL; không kiểm tra bằng cách tìm chuỗi `spotify`/`youtube` trong toàn bộ URL. Một URL hợp lệ về cú pháp không chứng minh nội dung nhạc còn tồn tại hoặc mọi điện thoại đều phát được.

## 7. P1 — làm sau demo

- Thanh toán, đặt cọc, hoàn tiền, COD và đối soát.
- Giỏ hàng, nhiều thiết kế trong một đơn, tài khoản khách, lịch sử mua hàng.
- Nhiều mẫu/sản phẩm, mã giảm giá, kho hàng, phí giao hàng tự động.
- Vẽ chữ ký, chỉnh ảnh chuyên sâu, kéo thả, đổi font tự do và lưu bản nháp.
- Luồng cửa hàng gửi mẫu để khách duyệt nhiều vòng.
- File in chuẩn, xuất PDF, kiểm tra độ phân giải và màu với nhà in.
- Email/SMS, tích hợp vận chuyển, tự cập nhật giao hàng, giao thất bại/đổi trả.
- Ghi NFC trong trình duyệt, đổi link qua website, đăng nhập nền tảng nhạc hoặc phát nhạc trên website.
- Phân quyền nhiều nhân viên, báo cáo doanh thu và vận hành nhiều người dùng thực tế.

## 8. Quy tắc khi phạm vi thay đổi

Chỉ thêm chức năng sau khi vòng demo bắt buộc ở `04-acceptance-demo.md` chạy thành công. Nếu thiếu thời gian, giảm trang trí, số mẫu và hiệu ứng trước; không bỏ việc lưu dữ liệu, quyền quản trị hoặc tính đúng đắn của đơn. Phải ghi rõ phần còn giả lập và phần đã kiểm thử trong buổi demo.
