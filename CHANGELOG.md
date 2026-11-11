# Changelog

## [v1]

Có migration: có (bản phát hành đầu tiên; DB mới cần chạy các migration 001–006 bằng lệnh migrate của ứng dụng).

- Thêm CI Node 24/MySQL, kiểm tra storage bằng MinIO và nghiệm thu Docker trên Linux amd64.
- Thêm tài liệu bàn giao, sinh env production ngoài repo và backup/restore local/S3 với checksum, bảo vệ lookup secret và diễn tập CI trên stack tạm.
- Thêm release Docker Hub theo tag version và SHA; kiểm tra cùng image trước khi push, không tự triển khai server.
- Asset không tồn tại trả 404 cho GET/HEAD; đường dẫn SPA không có đuôi file vẫn được phục vụ qua app shell.
- G1b có driver local/S3 và công cụ copy ảnh có checksum; cấu hình bucket/role do người vận hành quản lý. CI đã qua kiểm tra MinIO/S3 và Docker acceptance tại commit `26d73bd`.

Các migration khởi tạo: `001_init.sql`, `002_seed_product.sql`, `003_users.sql`, `004_r1_remove_auth_add_lookup.sql`, `005_r1_finalize_lookup.sql`, `006_r3_admin_products.sql`. Chạy toàn bộ theo thứ tự qua migration runner; migration 004 gỡ các bảng tài khoản legacy của migration 003. Image `v1` chỉ được coi là đã phát hành sau khi workflow release push thành công lên Docker Hub.
