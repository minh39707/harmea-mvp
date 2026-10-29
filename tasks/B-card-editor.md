# B — Cá nhân hóa và bản xem trước

**Trạng thái:** đã triển khai editor/crop/PNG và đầu ra ảnh gốc; còn nghiệm thu tương tác trên trình duyệt. **Ước lượng ban đầu:** 2 giờ. Đầu ra phục vụ checkout ở task C.

**Cập nhật 29/10/2026:** renderer SVG dùng chung cho preview và PNG, QA-06 đã có trong mẫu, ảnh gốc/PNG lưu riêng bằng IndexedDB theo từng snapshot giỏ. Đã chạy 8 tests editor, 25 tests API và kiểm tra trực quan PNG raster mẫu; browser host chưa khả dụng nên chưa đánh dấu thao tác upload/download/IndexedDB/responsive là PASS. Xem [báo cáo B](../docs/qa/2026-10-29-task-b.md).

## Phạm vi và phụ thuộc

Đọc `docs/01-requirements.md`, `docs/02-architecture.md`, `docs/03-data-api.md`, `docs/04-acceptance-demo.md` và `contracts/openapi.json`. Dùng đúng kiểu dữ liệu và phiên bản template của sản phẩm. Khi API A chưa xong, fixture phải theo hợp đồng và được ghi rõ là fixture.

Các đường dẫn dự kiến phụ trách: `apps/web/src/features/editor/`, phần giới thiệu sản phẩm, tài nguyên mẫu và thành phần dùng riêng cho designer. Phối hợp tại file route/root; không thay giao diện checkout/admin của task khác.

## Kết quả phải có

- Một mẫu thẻ cố định với ảnh, tên, ngày sinh, địa điểm, ngày kỷ niệm, chữ ký nhập bằng chữ và URL nhạc.
- **QA-06 (chuyển từ task E):** hiển thị `dateOfBirth` trên `CardPreview` khi có nhập, đồng nhất với preview PNG. Kiểm tra đổi ngày sinh làm thay đổi cả hai bản xem trước; E chỉ kiểm tra hồi quy.
- Xem trước ngay khi thay dữ liệu; chọn ảnh và lưu các thông số crop theo hợp đồng. Dùng một cách crop đơn giản đủ kiểm soát ảnh trong khung, không xây trình kéo thả nhiều lớp.
- Phân biệt kích thước thẻ 54 × 86 mm, artwork 57 × 90 mm và safe area 49 × 82 mm. Không tự khẳng định PNG là file in đạt chuẩn khi chưa kiểm tra với quy trình in.
- Xuất preview PNG thể hiện cùng cấu hình đang thấy. Chờ ảnh và font tải xong trước khi xuất; giữ nguyên ảnh gốc cho gửi đơn.
- Đầu ra cho từng dòng giỏ gồm cấu hình thiết kế, ảnh gốc, preview PNG, productId và templateVersion theo contract 0.2.0. Các trường ngày tùy chọn nếu bỏ trống phải được bỏ khỏi JSON, không gửi chuỗi rỗng. C ghép cặp photo_i/preview_i theo thứ tự items[]. Không lưu tệp cá nhân vào repository.
- Validation tại trình duyệt giúp khách sửa lỗi; server vẫn là nơi kiểm tra quyết định.

## Hoàn thành khi

1. Thay ảnh/chữ thấy bản xem trước cập nhật; tên dài được xử lý theo giới hạn, không che vùng quan trọng.
2. File PNG xuất ra chứa đủ ảnh/chữ theo cấu hình thử; không bị trống do ảnh hoặc font chưa tải.
3. Thử tên tiếng Việt có dấu và ảnh dọc/ngang; đầu ra vẫn sử dụng được.
4. Bàn giao dữ liệu cho checkout mà không mất ảnh/crop/URL; typecheck và build qua.

## Prompt giao việc

```text
Triển khai task B trong tasks/B-card-editor.md. Đọc AGENTS.md nếu có, README.md, docs/01-requirements.md, docs/02-architecture.md, docs/03-data-api.md, docs/04-acceptance-demo.md và contracts/openapi.json trước khi viết; tận dụng khung React/TypeScript/Vite hiện tại.

Làm công cụ cá nhân hóa một mẫu Harméa tối thiểu: ảnh, thông tin chữ, chữ ký dạng chữ, URL nhạc và bản xem trước PNG. Giữ đúng cấu hình template/crop của hợp đồng. Ưu tiên dữ liệu đúng và xuất ảnh ổn định, không thêm editor nhiều lớp, animation, thanh toán hoặc mẫu mới. Preview phục vụ kiểm tra thiết kế; không tuyên bố file in đã đạt chuẩn. Chỉ sửa phần frontend thuộc designer và phần nối cần thiết, không viết lại backend.

Kiểm tra trực quan bản xem trước và PNG với tiếng Việt, ảnh ngang/dọc; báo rõ nếu chưa kiểm tra bằng trình duyệt. Chạy typecheck/build, liệt kê phần đã làm, giới hạn và dữ liệu bàn giao cho task C.
```
