# Kiến trúc Harméa

Cập nhật 11/11/2026 theo roadmap hiện hành. Đích đóng gói Docker thuộc G1–G3; R1 bỏ đăng nhập và đổi tra cứu, R2 hoàn thiện giỏ/ảnh trên thiết bị và chuẩn hóa ảnh.

## Thành phần

```mermaid
flowchart LR
    Browser[React + Vite] -->|HTTP(S)| Proxy[Reverse proxy khi triển khai]
    Proxy --> App[Docker app · Express + React]
    App --> DB[(MySQL 8.4 / mysql2)]
    App --> Files[(storage/uploads riêng tư)]
```

- Web: React, TypeScript, Vite; điều hướng hiện dùng History API và danh sách route tường minh.
- G2: sau static middleware, đường dẫn có đuôi file (kể cả dấu chấm được URL-encode), dotfile và tài nguyên thiếu trong `/assets/`, `/images/`, `/fonts/` trả 404; không trả app shell. Route SPA không có đuôi file vẫn nhận HTML, kể cả khi thư mục cha chứa dấu chấm. GET/HEAD và cache headers được kiểm tra HTTP.
- API: Express/TypeScript trên Node 24; route theo module trong `apps/api/src/modules/`.
- G1: multi-stage Docker image `linux/amd64`, runtime user `node`, Node 24 Bookworm slim; Docker Engine chưa chạy ở máy phát triển nên image/runtime chưa được nghiệm thu.
- DB: MySQL 8.4 qua `mysql2`; truy vấn và transaction đi qua adapter `apps/api/src/db.ts`.
- Tệp: tên do server sinh trong `storage/uploads`, không phục vụ qua static middleware.
- G1b: `FileStorage` cung cấp put/get/delete/exists cho local và S3. `STORAGE_DRIVER` mặc định local; S3 giữ khóa DB hiện tại dưới prefix `uploads/`, yêu cầu SSE-S3 khi ghi, không dùng public URL/presigned. API admin stream qua driver sau gate. SDK dùng credential provider chain, EC2 dùng instance role; factory từ chối key trong env và custom endpoint. Bucket/IAM do người vận hành cung cấp.
- Không dùng ORM, framework/router mới hoặc microservice.

## Tạo đơn và ảnh

1. Browser gửi multipart gồm payload và cặp ảnh đã chuẩn hóa/preview cho từng thiết kế.
2. Server parse/validate payload, giới hạn request, decode ảnh, kiểm tra crop, kiểm tra mẫu và đọc giá hiện hành từ DB.
3. Server chuẩn hóa SĐT bằng hàm dùng chung cho checkout và lookup; tạo `lookup_phone_hash = HMAC-SHA256(phone, LOOKUP_SECRET)`.
4. Server xoay ảnh theo EXIF, so kích thước đã xoay với kích thước client báo, chuyển ảnh sang sRGB, giới hạn cạnh dài theo `PHOTO_MAX_EDGE` và JPEG mozjpeg theo `PHOTO_JPEG_QUALITY`. PNG preview nén lossless và giữ nguyên pixel. Server ghi tệp bằng khóa do server tạo.
5. Một transaction lưu snapshot đơn, dòng thiết kế và event `pending`. Nếu DB thất bại, API dọn đúng các file của request.
6. Response trả mã đơn và tổng tiền; không phát hành tracking token.

DB và filesystem không có transaction chung; process dừng giữa lúc ghi file và commit DB có thể để lại file mồ côi. Cleanup trong nhánh lỗi đã có; quét file mồ côi là công việc riêng.

Giỏ hàng lưu metadata trong localStorage và mỗi thẻ có cặp Blob riêng trong IndexedDB. Khi lưu, IndexedDB được ghi trước metadata; cập nhật ghi Blob mới, metadata mới, rồi xóa Blob cũ. Storage event đồng bộ thay đổi giữa tab; Web Locks tuần tự hóa lưu ảnh và dọn orphan nếu trình duyệt hỗ trợ. Nén client dùng EXIF orientation, JPEG quality 0.85, cạnh dài tối đa 2400 px; đầu vào tối đa 15 MiB và hiện bị giới hạn 20 MP bởi header validator.

`requestKey` UUID cùng fingerprint được giữ trong sessionStorage của checkout khi kết quả chưa rõ; không lưu số điện thoại, địa chỉ, body, token hoặc URL nhạc. Request trùng trả 409, UI hướng dẫn tra cứu bằng mã đơn + SĐT và không tự gửi lần mới.

## Tra cứu

`POST /api/tracking/lookup` nhận `{ orderNumber, phone }` trong body. Server trim/uppercase mã đơn, chuẩn hóa SĐT, tìm đơn, rồi so hash bằng `timingSafeEqual`. Mã sai, SĐT sai và mã sai định dạng trả chung 404.

Limiter memory giữ cửa sổ 15 phút: tối đa năm lần sai cho mỗi mã đơn và 20 lần sai cho mỗi IP. Đây là giới hạn cho một API instance; không chạy nhiều instance trước khi thay limiter bằng bộ đếm dùng chung. Mã đơn và SĐT không xuất hiện trong URL hay log.

Response công khai là allowlist: `orderNumber`, `status`, `createdAt`, `updatedAt`, `history` và `trackingCode`. Tên, số điện thoại, địa chỉ, ảnh, thiết kế, URL nhạc, ghi chú và lý do hủy ở lại trong API quản trị.

## Admin gate

Không có tài khoản admin, cookie, session hay login trong app. `ADMIN_ENABLED` mặc định bật ở môi trường không phải production và tắt trong production. Khi tắt, middleware trả 404 chung cho `/api/admin*` và trang 404 cho `/admin*`. Khi bật trong production, tiến trình log một cảnh báo; reverse proxy phải chặn đường dẫn bằng Basic Auth hoặc giới hạn IP trước khi chuyển request tới app.

Ảnh chỉ được trả qua `/api/admin/orders/:id/items/:itemId/assets/:kind` sau gate. Không mở `storage/uploads` public. Admin đổi trạng thái kèm `expectedVersion`; cập nhật order và history event trong một transaction, actor là `admin`.

R3 thêm màn sản phẩm, thống kê SQL và CSV stream theo keyset. Cập nhật sản phẩm khóa hàng và kiểm tra `version`; lịch sử giá nằm cùng transaction. Báo cáo dùng ngày UTC+7 và đổi sang mốc UTC trước truy vấn. CSV chỉ chọn các cột đã allowlist, escape công thức và không đọc URL nhạc.

## Migration và môi trường

MySQL migration trong `database/` có SHA-256 lưu ở `schema_migrations`; runner dùng `GET_LOCK`. Không sửa migration đã áp dụng. DB local đã áp `003_users.sql`, nên R1 giữ file lịch sử này và dùng migration mới để drop bảng/cột auth. Migration `004` thêm cột hash nullable và gỡ auth; `scripts/backfill-lookup.mjs` lấy SĐT từ snapshot và tính HMAC; migration `005` đặt NOT NULL và bỏ tracking token. Nếu `005` bị hoãn vì đơn cũ chưa có hash, chạy script backfill rồi chạy `db:migrate` lại.

Migration `006_r3_admin_products.sql` thêm `products.description`, `products.version`, ràng buộc giá và bảng `product_price_history`; migration này không thay đổi snapshot đơn cũ.

`LOOKUP_SECRET` cần tối thiểu 32 byte. `npm run setup` sinh secret riêng trong `.env`; secret production thiếu hoặc ngắn thì API từ chối khởi động. Không commit `.env`, storage hoặc DB test.

`APP_URL` là nguồn chuẩn cho Origin hợp lệ, robots và sitemap. Nếu chưa có `APP_URL`, ứng dụng đọc tạm `APP_ORIGIN` và cảnh báo một lần mà không ghi giá trị. Production chỉ cho phép Origin khớp origin của `APP_URL`; localhost chỉ được thêm ngoài production. API mặc định nghe `0.0.0.0:3000`; khi chạy dev và muốn giới hạn loopback, thêm `HOST=127.0.0.1` vào `.env`. Vite ở cổng 5173 proxy `/api` tới `127.0.0.1:3000` (hoặc `API_PORT`).

Ảnh đầu vào ở API bị giới hạn 40 MP; `PHOTO_MAX_EDGE` (mặc định 2400) và `PHOTO_JPEG_QUALITY` (mặc định 82) cấu hình kích thước/mã hóa ảnh lưu. Ảnh lớn được xử lý trước khi ghi vào `storage/uploads`.

Các migration PostgreSQL cũ trong `database/postgres-legacy/` chỉ để đọc lịch sử, không chạy và không tự nhập dữ liệu vào MySQL. `TEST_DATABASE_URL` tạo DB MySQL tạm cho mỗi suite; suite xóa DB đó khi kết thúc.

## Triển khai và nghiệm thu

`GET /health` chỉ xác nhận tiến trình sống và không phụ thuộc DB/storage. `GET /ready` ping MySQL rồi kiểm tra ghi/xóa probe qua driver storage đang chọn: `UPLOAD_DIR` khi local, object dưới `uploads/` khi S3; dependency chưa sẵn sàng thì trả 503. App khởi động với pool DB lazy kể cả khi MySQL tạm không kết nối được; request cần DB/storage trả 503 nếu backend không truy cập được. Mỗi response được log một dòng JSON gồm method, path không có query, status và duration; lỗi 5xx được ghi an toàn ra stderr. SIGTERM/SIGINT ngừng nhận kết nối, chờ tối đa 9 giây rồi đóng kết nối còn lại, đóng pool DB và S3 client nếu có.

`compose.dev.yaml` dành cho MySQL local. `docker-compose.yml` dùng app trên external network `web` và MySQL trong network `backend` internal; cả hai đều không có `ports`. App lưu `/app/storage` và MySQL dùng volume riêng. `docker-compose.local.yml` chỉ là override loopback nếu chủ máy muốn truy cập app qua `127.0.0.1:3000`. Tạo network `web` trước khi chạy Compose production; file không chứa cấu hình Caddy.

G1 đã thêm Dockerfile, Compose production, checks runtime, và cập nhật `.env.example`; Docker CLI hiện có nhưng daemon chưa chạy nên Docker build/runtime chưa được kiểm tra. Hạ tầng AWS/Caddy do người vận hành khác cấu hình; agent không thao tác tài khoản/cloud. Test MySQL không thay thế việc mở trình duyệt và thử UI ở 375/768/1440 px.
