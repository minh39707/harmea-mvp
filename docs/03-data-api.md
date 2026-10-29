# Dữ liệu và hợp đồng API — giỏ hàng

Nguồn chuẩn: `contracts/openapi.json` phiên bản 0.2.0 và `database/*.sql`. Quyết định 29/10/2026 giữ giỏ hàng thay phạm vi một thiết kế/không giỏ hàng ban đầu. Không thanh toán, không tài khoản khách, không cloud.

## 1. Mô hình dữ liệu

- `products`: tối đa một sản phẩm đang hoạt động, một template, giá demo nguyên VND.
- `orders`: một người nhận, một status/version và lịch sử chung. `quantity` là tổng 1–100 thẻ; `subtotal_vnd = unit_price_vnd × quantity`. Giá/template/sản phẩm/người nhận là snapshot.
- `order_items`: 1–10 dòng theo position, mỗi dòng 1–10 bản; design_snapshot/photo_key/preview_key riêng. Cùng product/giá/template của header, URL nhạc riêng trong design, không fetch backend.
- `order_status_events`: một event mỗi version, kể cả pending lúc tạo; status/version và event cùng transaction.
- `admin_sessions`: SHA-256 của token ngẫu nhiên 32 byte, hạn 8 giờ, không lưu raw token.

Migration 004 thêm order_items, nới quantity header đến 100 và backfill đơn một thiết kế cũ. Các cột design_snapshot/photo_key/preview_key cũ của orders giữ bản dòng đầu để tương thích; API chi tiết dùng order_items. Không sửa migration 001–003 đã áp dụng.

`demo_checkouts` là kho legacy riêng, không tự chuyển thành orders, không xuất hiện trong admin canonical. Các đơn này chưa có tiến độ sản xuất/giao hàng.

## 2. Endpoint

| Method/path | Quyền | Trạng thái sau A |
| --- | --- | --- |
| GET `/api/health` | Public | Đã có |
| GET `/api/products/current` | Public | Đã có Product theo contract; alias deprecated cho client cũ |
| POST `/api/orders` | Guest | Đã có multipart nhiều dòng |
| POST `/api/tracking/lookup` | Token trong body | Đã có allowlist tiến độ/lịch sử |
| POST `/api/admin/session` | Login | Đã có scrypt + cookie |
| GET `/api/admin/session` | Admin | Đã có kiểm tra phiên |
| DELETE `/api/admin/session` | Admin | Đã có thu hồi phiên/cookie |
| GET `/api/admin/orders` | Admin | Đã có lọc/pagination |
| GET `/api/admin/orders/{id}` | Admin | Đã có snapshots/items/lịch sử |
| PATCH `/api/admin/orders/{id}/status` | Admin | Đã có expectedVersion/state machine |
| GET `/api/admin/orders/{id}/items/{itemId}/assets/{kind}` | Admin | Đã có photo/preview từng dòng |
| POST `/api/demo-checkouts`, `/api/demo-tracking` | Legacy public | Tạm giữ cho frontend trước C; không thuộc luồng admin mới |

UI chưa nối API canonical đến C; UI admin còn D. API đã chạy bằng Express/PGlite/file thật trong integration test, chưa nghiệm thu PostgreSQL hoặc trình duyệt.

## 3. Multipart tạo đơn

```json
{
  "requestKey": "22222222-2222-4222-8222-222222222222",
  "designConfirmed": true,
  "items": [{
    "productId": "11111111-1111-4111-8111-111111111111",
    "templateVersion": "harmea-card-v1",
    "quantity": 2,
    "design": {
      "fullName": "Demo Harméa",
      "musicUrl": "https://www.youtube.com/watch?v=demo",
      "color": "cream",
      "crop": { "x": 0, "y": 0, "width": 1, "height": 1 }
    }
  }],
  "recipient": { "name": "Khách Demo", "phone": "0900000000", "address": "Địa chỉ giả cho demo" },
  "note": "Không giao hàng thật"
}
```

Ví dụ dùng dữ liệu giả và URL placeholder, không phải bài hát đã xác minh; sinh requestKey mới bằng crypto.randomUUID() cho lần đặt mới.

`payload` chứa JSON dưới dạng string; mỗi dòng i từ 0 có đúng một `photo_i` (JPEG/PNG ≤5 MiB) và `preview_i` (PNG ≤2 MiB). Không nhận phần dư/lặp/thiếu hoặc ảnh động/nhiều frame. Server decode đầy đủ, ≤20MP/cạnh8192; lưu đúng byte ảnh gốc và PNG proof riêng tư, tên ngẫu nhiên do server sinh.

Tổng request ≤16 MiB, JSON ≤65.536 ký tự, tối đa hai upload đang xử lý mỗi tiến trình. Giới hạn tổng có thể nhỏ hơn tổng giới hạn từng ảnh. Quá kích thước trả 413; sai kiểu/không decode được trả 415; cấu trúc multipart/JSON hỏng trả 400. Web FormData có buffer giới hạn, không phải streaming-to-disk, chưa đo tải public lớn.

Tên, URL nhạc và crop bắt buộc. Ngày sinh, ngày kỷ niệm, địa điểm, chữ ký tùy chọn; ngày nếu có phải YYYY-MM-DD có thật, không gửi chuỗi rỗng. DOB không trong tương lai theo Asia/Ho_Chi_Minh. Màu cream/blue/rose, mặc định cream. Crop hữu hạn trong [0,1], width/height >0, x+width/y+height ≤1, theo ảnh đã xử lý chiều EXIF. URL HTTPS/exact-host allowlist, không credentials/cổng tùy chỉnh; không tự tải URL. Preview phải được admin đối chiếu với thiết kế, không được cam kết là file in chuẩn.

Lấy giá từ DB, từ chối field giá/tổng client. Kiểm tra product/template trong transaction; sai trả PRODUCT_CHANGED 409. `shippingFeeVnd: null` là chưa báo phí, không phải miễn phí hay đã thanh toán. Không sửa snapshot/tệp của đơn gửi qua API.

## 4. Tracking, auth và trạng thái

Token tracking ngẫu nhiên 32 byte, chỉ lưu SHA-256 và trả một lần khi tạo thành công. `/track#token` → POST lookup body. UNIQUE requestKey trả DUPLICATE_REQUEST 409, không replay token. Mất response cần liên hệ cửa hàng; không tự sinh khóa mới cho retry. Khóa mới chỉ dành cho lần đặt mới.

Public response chỉ có orderNumber/status/createdAt/updatedAt/trackingCode và history `{status,occurredAt}`; không ID, giá, người nhận, thiết kế, ảnh, URL, note, actor/lý do hủy. Admin response dùng allowlist khác và chỉ trả endpoint ảnh có xác thực, không key/path filesystem hoặc token/hash.

Cookie admin `harmea_admin`: HttpOnly, SameSite=Lax, Path=/api/admin, 8 giờ; Secure khi APP_ORIGIN dùng HTTPS. Login thay phiên của client hiện tại; logout/expiry thu hồi quyền dù còn cookie. Mật khẩu scrypt từ setup, không có password mặc định; chưa cấu hình hash trả 503. Giới hạn 5 login/IP/phút và 40 mutation/IP/phút; Origin áp dụng POST/PATCH/DELETE/PUT. Không localStorage cho admin session; không log token, mật khẩu hoặc body/URL nhạc.

```text
pending -> confirmed -> producing -> shipping -> completed
   |           |
   +-----------+----> cancelled (cần lý do)
```

Không nhảy bước/quay lùi/cùng trạng thái/mở lại đơn cuối. PATCH gửi expectedVersion; cùng version chỉ một lần thành công, lần còn lại VERSION_CONFLICT 409, không event thừa. cancellationReason chỉ cho cancelled, trackingCode chỉ cho shipping. Website ghi nhận thao tác admin, không chứng minh NFC hoặc giao hàng vật lý.

Error envelope `{ "error": { "code": "...", "message": "..." } }`. Thiếu phiên 401, tài nguyên không thấy 404, validation 422, conflict 409. Không trả stack trace hoặc dữ liệu nội bộ.

## 5. Kiểm tra và vận hành

`npm.cmd run test:api` dùng Express/PGlite/file thật trong thư mục tạm, gồm migration lặp, đa thiết kế, giá/snapshot, ảnh, privacy, session/rotation/logout/expiry, state/concurrency, rollback DB + dọn tệp khi insert event lỗi và restart. Không mock database. `contract:check` chỉ xác minh file contract hợp lệ.

Dừng API trước khi migrate PGlite; không mở hai process cùng DATA_DIR. Migration 004 không tự áp vào database đang chạy; dữ liệu local hiện có chưa được thay đổi trong phiên phát triển A. Sau khi dừng API, chạy `npm.cmd run db:migrate`, `db:check`, rồi khởi động lại.

DB và filesystem không cùng transaction. Nhánh lỗi dọn file vừa ghi; process chết giữa ghi file và commit có thể để tệp mồ côi, chưa có job quét. Chưa nghiệm thu PostgreSQL server, tải public lớn hoặc khôi phục power loss. Route demo legacy giữ hành vi cũ (ảnh nén trong JSON, replay token), sẽ chuyển client ở C; không dùng kết quả legacy để tuyên bố API canonical đã được nghiệm thu qua UI.
