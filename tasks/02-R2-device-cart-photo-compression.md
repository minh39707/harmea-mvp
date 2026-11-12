# R2 — Giỏ nhiều thẻ trên thiết bị và nén ảnh

**Trạng thái:** đã triển khai 11/11/2026; browser QA và đo dung lượng client còn chờ môi trường có browser. Xem [báo cáo R2](../docs/qa/2026-11-11-task-R2.md). **Ước lượng:** 3–5 giờ. **Phụ thuộc:** R1.

## Mục tiêu

Khách tải ảnh lên, ướm thử vào thẻ demo, **lưu thẻ vào giỏ rồi chỉnh tiếp để tạo thẻ khác**, lưu được tối đa 10 thẻ (mỗi thẻ có ảnh, crop và nội dung riêng), mở lại sửa từng thẻ, rồi đặt hàng. Tất cả lưu trên trình duyệt (không có tài khoản). Ảnh được nén để nhẹ nhưng vẫn đủ nét để in.

## Hiện trạng cần đọc trước

`features/editor/asset-store.ts` (IndexedDB `harmea.editor.v1`, Blob ảnh gốc + PNG preview), `features/cart/cart-storage.ts` (localStorage `harmea.cart.v2`, tối đa 10), `features/editor/useEditor.ts`, `prepared-item.ts`, `apps/api/src/modules/orders/uploads.ts`. Agent ghi vào báo cáo hành vi **hiện tại** của nút thêm vào giỏ và nút sửa, trước khi đổi.

## Phần 1 — Luồng lưu thẻ (phải chính xác)

| # | Quy tắc |
|---|---|
| C1 | Editor có hai chế độ, luôn hiển thị rõ: **Thẻ mới** và **Đang sửa thẻ #n**. |
| C2 | Ở chế độ Thẻ mới, nút **"Lưu vào giỏ"** tạo một thẻ mới (UUID mới), **giữ nguyên editor** với các giá trị hiện tại để khách chỉnh tiếp. Lần lưu sau tạo **thẻ khác**, không ghi đè thẻ vừa lưu. |
| C3 | Ở chế độ Đang sửa (vào từ giỏ), có hai nút: **"Cập nhật thẻ này"** (ghi đè đúng thẻ đó) và **"Lưu thành thẻ mới"** (thẻ gốc giữ nguyên). Có nút "Thoát chế độ sửa". |
| C4 | **Mỗi thẻ có bản Blob ảnh riêng trong IndexedDB** (key riêng), kể cả khi hai thẻ dùng cùng một file ảnh. Xóa hay sửa thẻ này không bao giờ ảnh hưởng thẻ khác. Không tối ưu kiểu dùng chung Blob ở bản này. |
| C5 | **Ghi Blob vào IndexedDB trước, rồi mới ghi metadata vào localStorage.** Ghi metadata lỗi thì xóa Blob vừa ghi. Cập nhật thẻ thì ghi Blob mới trước, cập nhật metadata, cuối cùng mới xóa Blob cũ. |
| C6 | **PNG preview được render từ snapshot** state (design, crop, ảnh) chụp lúc bấm nút. Khách chỉnh tiếp trong lúc đang lưu không làm lệch preview so với dữ liệu đã lưu. |
| C7 | Nút bị khóa trong lúc đang lưu (chống bấm hai lần tạo hai thẻ). Hiển thị trạng thái: "Đang lưu…" / "Đã lưu thẻ #n" / "Lỗi – thử lại". |
| C8 | Đủ 10 thẻ thì báo rõ, **giữ nguyên state editor**, gợi ý đặt hàng hoặc xóa bớt. |
| C9 | Hai tab cùng mở: dùng sự kiện `storage` để đồng bộ danh sách giỏ giữa các tab. Đang sửa một thẻ mà tab khác đã xóa thẻ đó thì báo và cho chọn "Lưu thành thẻ mới". |
| C10 | Gọi `navigator.storage.persist()` (nếu có) khi lưu thẻ đầu tiên. Hiển thị dòng nhắc: "Giỏ hàng lưu trên trình duyệt này; xóa dữ liệu trình duyệt sẽ mất giỏ." |
| C11 | Dọn Blob mồ côi khi app khởi động: Blob trong IndexedDB không có thẻ nào trong localStorage tham chiếu thì xóa. |

## Phần 2 — Nén ảnh

Vùng artwork 57×90 mm in ở 300 dpi cần khoảng **673×1063 px** trong phần ảnh được crop.

**Trên trình duyệt** (trước khi lưu vào IndexedDB):
- Decode bằng `createImageBitmap(file, { imageOrientation: 'from-image' })` (xoay đúng chiều theo EXIF). Thu nhỏ để cạnh dài ≤ **2400 px** (không phóng to ảnh nhỏ), xuất JPEG quality **0.85** qua canvas. Kết quả không còn metadata EXIF/GPS.
- Ảnh PNG có nền trong suốt thì vẽ lên nền trắng. Đầu vào chỉ nhận JPEG/PNG như hiện tại, file thô tối đa 15 MB.
- Crop lưu theo kích thước của **ảnh đã nén** (chuẩn hóa 0–1 như hiện tại, nên không đổi công thức).
- Hiển thị dung lượng trước/sau khi chọn ảnh.
- **Cảnh báo chất lượng in**: nếu vùng crop trên ảnh đã nén nhỏ hơn 673×1063 px thì hiện "Vùng ảnh đã chọn có độ phân giải thấp, thẻ in có thể bị mờ" ngay khi kéo crop và trong giỏ. Chỉ cảnh báo, không chặn.
- Thẻ cũ trong giỏ (ảnh chưa nén) vẫn mở và đặt hàng được, không bắt chọn lại ảnh.

**Trên server** (khi `POST /api/orders` nhận ảnh):
- Giữ kiểm tra hiện có (magic bytes, decode thật, giới hạn kích thước). Thêm `limitInputPixels` (40 MP).
- Chuẩn hóa ảnh gốc của mỗi dòng: `rotate()` theo EXIF, xóa metadata, chuyển sRGB, cạnh dài ≤ 2400 (không phóng to), JPEG mozjpeg quality 82. Nếu ảnh nhận được **đã** là JPEG ≤ 2400 px và không có metadata thì vẫn re-encode cho thống nhất; ghi lý do trong báo cáo nếu agent chọn khác.
- **Kiểm tra crop không bị lệch sau khi xoay:** nếu kích thước sau `rotate()` khác kích thước client báo (`photoWidth`/`photoHeight`) thì từ chối 422 với thông báo "Ảnh bị xoay khác với bản xem trước, hãy chọn lại ảnh". Không tự quy đổi crop.
- PNG preview: tối ưu không mất dữ liệu (`compressionLevel: 9`), giữ đúng kích thước.
- Tham số `PHOTO_MAX_EDGE` (2400) và `PHOTO_JPEG_QUALITY` (82) đọc từ env, có mặc định, ghi vào `.env.example`.

## Test bắt buộc

- **Unit (Node):** công thức cảnh báo chất lượng in; hàm tính kích thước sau thu nhỏ (không phóng to, giữ tỷ lệ); logic chọn chế độ lưu (mới, cập nhật, lưu thành mới); thứ tự ghi C5 với một store IndexedDB/localStorage giả lập có thể ném lỗi ở từng bước (lỗi ở bước nào cũng không để lại Blob mồ côi hay metadata trỏ vào Blob không tồn tại); dọn Blob mồ côi C11.
- **Integration (MySQL + file thật):** ảnh 4000×3000 có EXIF orientation 6 và GPS → file lưu là JPEG, cạnh dài 2400, đã xoay, không còn EXIF/GPS, dung lượng < 1 MB. Ảnh 800×600 không bị phóng to. Kích thước sau xoay lệch với `photoWidth/photoHeight` → 422 và không để lại file. PNG preview sau tối ưu giống bản gốc từng pixel.
- Ghi vào báo cáo **số đo thực tế** với ít nhất 3 ảnh mẫu (ảnh điện thoại 12 MP, PNG chụp màn hình, ảnh nhỏ 800 px): dung lượng và kích thước trước/sau ở client và ở server.

## Hoàn thành khi

Mọi test qua. Kịch bản thủ công trên trình duyệt (nếu có; nếu không có thì ghi rõ chưa chạy): chọn 2 ảnh → tạo 4 thẻ (2 thẻ cùng ảnh khác crop) → reload → đủ 4 thẻ đúng crop → sửa thẻ 2 → thẻ 1 không đổi → đặt hàng 3 thẻ → thẻ còn lại vẫn trong giỏ → admin thấy đúng 3 thiết kế và ảnh. Báo cáo `docs/qa/<ngày>-task-R2.md`.

## Prompt giao việc

```text
Thực hiện task R2 trong tasks/02-R2-device-cart-photo-compression.md. Đọc tasks/00-ROADMAP.md, AGENTS.md, báo cáo R1, apps/web/src/features/{editor,cart,checkout}, app/useShop.ts và apps/api/src/modules/orders/{uploads,create,validation}.ts.

Làm luồng lưu thẻ trên thiết bị theo đúng C1–C11: chế độ Thẻ mới / Đang sửa, lưu vào giỏ rồi chỉnh tiếp, cập nhật hoặc lưu thành thẻ mới, mỗi thẻ có Blob riêng, ghi Blob trước rồi metadata, preview render từ snapshot, khóa nút khi đang lưu, đồng bộ nhiều tab, persist storage, dọn Blob mồ côi. Nén ảnh ở trình duyệt (2400 px, JPEG 0.85, xoay EXIF, bỏ metadata, cảnh báo chất lượng in) và ở server (rotate, bỏ metadata, sRGB, 2400 px, mozjpeg 82, từ chối khi kích thước lệch, tối ưu PNG không mất dữ liệu). Không thêm thư viện, không lưu ảnh lên server trước khi đặt đơn.

Viết unit và integration test bắt buộc, ghi số đo thực tế vào báo cáo. Chạy typecheck, build, contract:check, format:check (file R2 sửa) và mọi test. Viết báo cáo docs/qa/<ngày>-task-R2.md. Không commit, không tạo nhánh, không push: để thay đổi trong working tree cho Claude kiểm tra.
```
