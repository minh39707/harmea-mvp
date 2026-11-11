# Dữ liệu và API

OpenAPI chuẩn tại [`contracts/openapi.json`](../contracts/openapi.json), phiên bản 0.7.0. Các route có `x-status: planned` là kế hoạch; chỉ route `x-implementation-status: implemented` được xem là có runtime.

## Schema MySQL hiện tại

| Bảng | Nội dung chính |
|---|---|
| `products` | Một sản phẩm hiện hành, tên/mô tả, giá, template version, trạng thái bật/tắt và version |
| `product_price_history` | Giá cũ/mới và thời điểm đổi; ghi cùng transaction với cập nhật sản phẩm |
| `orders` | Mã đơn, request key, snapshot sản phẩm/người nhận, HMAC SĐT, giá và trạng thái |
| `order_items` | Snapshot từng thiết kế, số lượng và khóa ảnh gốc/preview |
| `order_status_events` | Lịch sử version, trạng thái nguồn/đích, actor `guest/admin/system` và ghi chú nội bộ |
| `schema_migrations` | Tên migration, checksum và thời gian áp dụng |

Không có bảng `users`, `sessions`, `admin_sessions`; `orders` không có `user_id` và event không có `actor_user_id`. Migration lịch sử đã áp dụng không bị sửa để xóa dấu vết; R1 dùng migration mới loại các bảng/cột auth khỏi schema runtime.

`orders.recipient_snapshot` giữ SĐT và địa chỉ cần cho giao hàng. `lookup_phone_hash` là HMAC-SHA256 của SĐT chuẩn hóa với secret `LOOKUP_SECRET`; không lưu thêm bản thô để tra cứu. `tracking_token_hash` đã bị gỡ sau khi backfill.

Migration 004 thêm hash nullable và xóa auth schema; `scripts/backfill-lookup.mjs` xử lý đơn cũ; migration 005 đặt `lookup_phone_hash NOT NULL` và xóa unique index/cột token. Migration 006 thêm mô tả/version sản phẩm và bảng `product_price_history`. Nếu migration cuối của R1 được hoãn do còn hash NULL, chạy `npm run db:backfill-lookup`, sau đó `npm run db:migrate`.

## Quy tắc số điện thoại và mã đơn

- Số điện thoại chuẩn hóa ở API tạo đơn và API lookup bằng cùng một hàm.
- Bỏ whitespace, dấu chấm và dấu gạch. Prefix `+84` hoặc `84` đổi thành `0`.
- Kết quả chỉ nhận dạng `^0[0-9]{9,10}$`.
- Mã đơn được trim, viết hoa và xác nhận `^HM-[0-9A-F]{16}$`.
- HMAC so sánh bằng `timingSafeEqual`; dữ liệu giả/sai định dạng dùng cùng lỗi 404.
- Mỗi mã đơn cho tối đa năm lượt sai/15 phút; mỗi IP tối đa 20 lượt sai/15 phút. Khi đạt ngưỡng, mọi yêu cầu tiếp theo trả 429 kèm `Retry-After` trước khi tra cứu/so SĐT, kể cả khi SĐT đúng. Bộ đếm trong memory dành cho một instance và tự mở lại sau 15 phút.

## API đã triển khai

| Method / path | Mục đích | Trạng thái |
|---|---|---|
| `GET /health` | Liveness độc lập với MySQL; dành cho container | Implemented |
| `GET /ready` | Ping MySQL và kiểm tra ghi/xóa qua storage local/S3 đang chọn; trả 503 nếu dependency chưa sẵn sàng | Implemented |
| `GET /api/health` | Health check không truy cập dữ liệu khách | Implemented |
| `GET /api/products/current` | Đọc sản phẩm/mẫu hiện hành và trạng thái nhận đơn | Implemented |
| `POST /api/orders` | Tạo đơn multipart, trả `orderNumber`, không trả token | Implemented |
| `POST /api/tracking/lookup` | Nhận `{ orderNumber, phone }` trong JSON body; trả allowlist tiến độ | Implemented |
| `GET /api/admin/orders` | Lọc/phân trang đơn; cần `ADMIN_ENABLED` | Implemented |
| `GET /api/admin/orders/{id}` | Chi tiết snapshot và URL nội bộ qua API admin | Implemented |
| `PATCH /api/admin/orders/{id}/status` | State machine + `expectedVersion`; event actor `admin` | Implemented |
| `GET /api/admin/orders/{id}/items/{itemId}/assets/{kind}` | Tải ảnh riêng qua admin gate | Implemented |
| `GET /api/admin/products` | Liệt kê sản phẩm qua admin gate | Implemented |
| `PATCH /api/admin/products/{id}` | Chỉnh tên, mô tả, giá, trạng thái bằng version; ghi lịch sử giá | Implemented |
| `GET /api/admin/stats?from=&to=` | Tổng hợp trạng thái, số thẻ, tạm tính và đơn/ngày theo UTC+7 | Implemented |
| `GET /api/admin/orders.csv?status=&from=&to=` | Stream CSV BOM; escape công thức, không xuất URL nhạc | Implemented |

`GET /api/admin/orders` nhận thêm `orderNumber` để khớp mã chính xác hoặc tiền tố. Stats mặc định 30 ngày gần nhất, tối đa 366 ngày; tổng tiền và số thẻ bỏ đơn hủy, còn số đơn theo trạng thái/ngày tính mọi trạng thái. Ngày đầu/cuối bao gồm trọn ngày giờ Việt Nam rồi chuyển thành mốc UTC trong SQL. CSV không có lọc ngày thì xuất toàn bộ lịch sử.

Mọi `/api/admin*` trả 404 chung khi gate tắt. `ADMIN_ENABLED` mặc định false trong production; khi bật phải chặn `/admin*` và `/api/admin*` tại reverse proxy. Dev local mặc định bật. Không còn `/api/auth/*`, `/api/me*` hoặc `/api/admin/session`.

## Hợp đồng tạo đơn

G1b giữ nguyên khóa ảnh trong `order_items` và URL API admin, đổi backend bằng `STORAGE_DRIVER=local|s3`. Ảnh S3 nằm dưới `uploads/`, chỉ được stream qua API admin sau gate; không phát URL S3/presigned. Tệp không có trả 404; driver không truy cập được trả 503. DB và storage không có transaction chung: khi tạo đơn lỗi, API thử dọn mọi khóa đã ghi và log sự kiện an toàn nếu dọn thất bại. Không có migration schema mới.

`POST /api/orders` nhận multipart có `payload` JSON và từng cặp `photo_i`, `preview_i`. Thiết kế mới gửi `photoWidth`/`photoHeight` sau khi client áp dụng EXIF orientation; nếu kích thước sau rotate của server không khớp, API trả 422 trước khi ghi tệp. Hai trường kích thước không bắt buộc để giữ tương thích giỏ cũ. `requestKey` UUID giúp retry cùng request; key trùng trả 409 và không tạo thêm đơn. Server xác thực dữ liệu, decode ảnh với giới hạn 40 MP, chuẩn hóa ảnh gốc sang JPEG sRGB cạnh tối đa `PHOTO_MAX_EDGE` (mặc định 2400), `PHOTO_JPEG_QUALITY` (mặc định 82), và nén PNG preview lossless. Một transaction ghi order snapshot, order items và event đầu.

Response 201 gồm `id`, `orderNumber`, `status`, quantity/tổng giá, tiền tệ và thời gian tạo. Mã đơn được hiển thị ở trang thành công để khách lưu; khách tự nhập mã + SĐT tại `/track`. SĐT trong snapshot được lưu ở dạng chuẩn hóa.

## Hợp đồng tra cứu công khai

Request body:

```json
{
  "orderNumber": "HM-0123456789ABCDEF",
  "phone": "0912 345 678"
}
```

Request dùng POST body, không dùng query string, fragment hoặc URL chứa thông tin tra cứu. Mã/SĐT sai, đơn không tồn tại và mã sai định dạng cùng trả `ORDER_NOT_FOUND` với một thông báo. Response chỉ gồm:

```json
{
  "orderNumber": "HM-0123456789ABCDEF",
  "status": "pending",
  "createdAt": "2026-11-11T00:00:00.000Z",
  "updatedAt": "2026-11-11T00:00:00.000Z",
  "trackingCode": null,
  "history": [{ "status": "pending", "occurredAt": "2026-11-11T00:00:00.000Z" }]
}
```

Không có tên, SĐT, địa chỉ, ghi chú, ảnh, thiết kế, URL nhạc, snapshot giá hoặc lý do hủy trong response công khai. `Cache-Control: no-store` được áp cho API.

## Tạo schema và kiểm tra

- `npm run db:migrate` áp file chưa chạy và xác thực checksum file đã áp.
- `npm run db:backfill-lookup` tính HMAC từ snapshot; không in dữ liệu khách.
- `npm run db:check` chỉ đọc migration/product hiện hành.
- Suite API/admin/checkout dùng MySQL thật trong database `harmea_test_<random>` tách riêng; không trỏ test vào dữ liệu cá nhân.
- Giá, snapshot và lịch sử không được sửa bằng dữ liệu gửi từ client. Upload được lưu ngoài web root và chỉ phục vụ qua API admin sau gate.
