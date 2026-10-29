# E Giai đoạn 2 — giao diện tối giản, 29/10/2026

Đã triển khai code E2 sau A–D. Chưa nghiệm thu giao diện bằng trình duyệt, chưa có ảnh trước/sau. Working branch: `refactor/clean-layout`.

## Đã thay đổi

- Tokens tập trung cho màu, bốn cấp chữ, khoảng cách bội 8, radius 6 và border 1. Serif dành cho h1/wordmark; nội dung dùng DM Sans. Màu accent chữ dùng biến thể tối hơn để đạt tương phản. Ba màu artwork nằm riêng trong CardPreview.css; không thay renderer SVG/PNG B.
- Header 64px: wordmark/badge Demo, Sản phẩm, Tra cứu đơn, icon giỏ/số lượng. Footer một hàng nội dung ngắn và link quản trị, cho phép wrap trên màn hình nhỏ.
- Bỏ announcement, breadcrumb, pills, tag/caption, thumbnail và tiêu đề phụ lặp. Chuyển ảnh bằng hai nút có aria-pressed. Giữ xem guide và kích thước artwork.
- Sản phẩm hai cột desktop, một cột mobile. Giữ hai trường chữ bắt buộc; đưa ảnh bắt buộc/crop ra ngoài details để dễ thấy, details chỉ chứa trường tùy chọn. Màu có vùng bấm 44px và tên màu hiện tại. Giữ tải PNG, busy state và chỉnh sửa thiết kế.
- Giỏ/checkout dùng cùng khung hai cột, tóm tắt sticky desktop và nằm trong luồng trên mobile. Giỏ trống có một câu và một nút. Bớt thông báo demo trùng; đặt ghi chú không thu tiền dưới hành động chính. Giữ xác nhận thiết kế/người nhận và thông báo retry chưa rõ kết quả.
- Success/tracking dùng một card giữa trang; giữ mã đơn, link, copy, tiến độ/lịch sử và thông tin riêng tư. Success vẫn có liên kết về sản phẩm để bắt đầu thiết kế khác.
- Gộp fineprint/test-note/muted thành note. Thông báo khách và lỗi dùng cùng khung góc dưới màn hình, giữ role status/alert; lỗi có nút đóng hoặc thử tải lại. Lỗi admin vẫn cạnh form để xử lý trong ngữ cảnh đăng nhập/cập nhật.
- Gom bốn file responsive cũ vào responsive.css; focus-visible cho cả input/select/textarea, nút ≥44px, reduced-motion áp dụng cả lệnh scroll JS. Admin dùng cùng tokens và typography.
- API, schema/migration, contract, cart storage, Blob/PNG, requestKey/fingerprint, tracking fragment và admin auth/state machine giữ nguyên. Không thêm dependency.

## Kiểm tra thực tế

Windows / Node 24.15.0; các tests dùng PGlite và tệp thử riêng, không thay DB local của chủ dự án.

| Kiểm tra | Kết quả |
|---|---|
| `format:check`, `typecheck`, `build`, `contract:check` | PASS |
| Tests A / B / C / D | 25 / 8 / 13 / 10 qua, tổng 56/56 |
| Smoke trước và sau E2 | 30 phép, 26 khớp, 4 lệch; không đổi kết quả |
| Màu CSS ngoài tokens.css/CardPreview.css | Không có qua quét tĩnh |
| Giới hạn file source | Không file TS/TSX/CSS nào >250 dòng; lớn nhất 170; App.tsx 9 dòng |
| Contrast theo màu token | muted/bg 4,65:1; muted/surface 4,90:1; accent chữ/bg 5,90:1; danger/nền lỗi 6,73:1; primary 14,15:1 |

Bằng chứng: [56 tests TAP](2026-10-29-clean-layout-phase2.tap), [kiểm tra tĩnh/contrast](2026-10-29-clean-layout-phase2-checks.json). Tests kiểm tra nghiệp vụ/API/client và byte ảnh, không render hoặc thao tác UI. Tỷ lệ tương phản tính từ màu sRGB tĩnh, không phải kết quả audit toàn trang. Không viết test chỉ để khớp tên class hoặc nội dung JSX.

Bốn lệch smoke vẫn là giả định legacy: gửi trùng route demo trả 200 thay 409; gọi canonical bằng JSON sai Content-Type trả 415 thay 422; token legacy không tra được qua lookup canonical; snapshot legacy không có PNG. Task E2 không sửa các route/dữ liệu lịch sử để khớp bộ smoke cũ. Tests canonical riêng đều qua.

## Chưa xác minh

Đã thử inventory browser qua cua và khởi tạo skill computer-use qua @oai/sky; browser access host và native pipe đều không khả dụng. Vì vậy **chưa PASS** các mục sau:

- Kích thước 375/768/1440 px: tràn ngang, bố cục header, bảng admin, sticky, nhãn/nút, ảnh portrait/landscape và font thực tế.
- Chuỗi thêm hai thiết kế → sửa một → reload giỏ → checkout dữ liệu giả → copy → mở /track#token; IndexedDB, Canvas, download và clipboard trên browser.
- Keyboard, focus thực, thông báo screen reader, hiển thị toast khi bàn phím mobile mở, reduced-motion qua thiết lập hệ điều hành.
- Login/logout/hết phiên/hai tab admin sau đổi CSS; diễn tập 5–7 phút, PostgreSQL/Docker và NFC vật lý.

CSS có breakpoint và vùng bấm theo yêu cầu nhưng chưa có bằng chứng render. Checklist docs/04 và nghiệm thu trực quan E2 tiếp tục chờ; code A–E đã triển khai không đồng nghĩa toàn MVP đã nghiệm thu.
