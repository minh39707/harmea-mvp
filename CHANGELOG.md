# Changelog

## [Unreleased]

Có migration: không (G2/G3 không thêm SQL so với G1b; DB khởi tạo lần đầu vẫn cần các migration 001–006).

- Thêm CI Node 24/MySQL, kiểm tra storage bằng MinIO và nghiệm thu Docker trên Linux amd64.
- Thêm tài liệu bàn giao, sinh env production ngoài repo và backup/restore local/S3 với checksum, bảo vệ lookup secret và diễn tập CI trên stack tạm.
- Thêm release Docker Hub theo tag version và SHA; kiểm tra cùng image trước khi push, không tự triển khai server.
- Asset không tồn tại trả 404 cho GET/HEAD; đường dẫn SPA không có đuôi file vẫn được phục vụ qua app shell.
- G1b đã có driver local/S3 và công cụ copy ảnh có checksum; cấu hình bucket/role do người vận hành quản lý, nghiệm thu MinIO/CI còn chờ chạy.

Khi phát hành, chuyển phần thay đổi tương ứng sang heading chính xác `## [vN]` hoặc `## [vN.M.K]`, giữ dòng `Có migration: có` hoặc `Có migration: không` ngay trong section đó. Nếu có SQL mới, liệt kê tên file và ảnh hưởng trước khi người vận hành chạy migrate. Chưa có release nào được tạo trong task này.
