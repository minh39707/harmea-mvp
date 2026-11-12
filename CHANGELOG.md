# Changelog

## [Unreleased]

Có migration: có (`007_product_price_89000.sql`: giá sản phẩm 89.000đ; `008_customer_payment_reports.sql`: ghi nhận khách báo chuyển khoản; giữ snapshot đơn cũ).

- Nhạc nền MP3 nội bộ chỉ tải/phát khi bấm; bật/tắt, lưu lựa chọn, âm lượng 35%, dừng ở tracking/admin.
- Đổi các màu xanh lá của giao diện sang navy blue; giữ các màu thiết kế thẻ.
- Checkout hiển thị QR người dùng cung cấp, số tiền snapshot và mã đơn; khách tự báo đã chuyển khoản, admin xem thời gian báo. Không tự xác minh giao dịch.
- CI/CD: push vào `main` chạy CI, push image `sha-<12>`/`main` lên Docker Hub rồi SSH deploy production. Cần backup tay trước khi merge có migration; script giữ app dừng nếu migration lỗi vì DDL có thể đã áp một phần. Chỉ tự quay image cũ khi migration hoàn tất mà không có thay đổi mới và app mới không ready. `ci.yml` không chạy lặp trên `main`; release theo tag `v*` giữ nguyên.

## [v1.1.0]

Có migration: không.

- Bảo mật: thêm Content-Security-Policy ở production (script/connect chỉ cùng origin, chặn object và nhúng iframe, cho phép ảnh data/blob của editor); có smoke regression.
- Editor: dropdown chọn thẻ đã lưu khôi phục đúng nội dung, ảnh và crop; “Thẻ mới” xóa bản nháp cũ.
- Giỏ hàng: chọn từng thẻ để đặt (ví dụ 3/4), thẻ chưa chọn giữ lại trong giỏ; không chọn thẻ nào thì không gửi được đơn.
- Mobile 375 px: sửa tràn chiều ngang ở trang chủ, giỏ hàng và URL nhạc dài.
- Checkout vẫn là đặt đơn demo trực tiếp, không thu tiền. Không đổi API, contract hay schema; `v1` giữ nguyên.

## [v1]

Có migration: có (bản phát hành đầu tiên; DB mới cần chạy các migration 001–006 bằng lệnh migrate của ứng dụng).

- Thêm CI Node 24/MySQL, kiểm tra storage bằng MinIO và nghiệm thu Docker trên Linux amd64.
- Thêm tài liệu bàn giao, sinh env production ngoài repo và backup/restore local/S3 với checksum, bảo vệ lookup secret và diễn tập CI trên stack tạm.
- Thêm release Docker Hub theo tag version và SHA; kiểm tra cùng image trước khi push, không tự triển khai server.
- Asset không tồn tại trả 404 cho GET/HEAD; đường dẫn SPA không có đuôi file vẫn được phục vụ qua app shell.
- G1b có driver local/S3 và công cụ copy ảnh có checksum; cấu hình bucket/role do người vận hành quản lý. CI đã qua kiểm tra MinIO/S3 và Docker acceptance tại commit `26d73bd`.

Các migration khởi tạo: `001_init.sql`, `002_seed_product.sql`, `003_users.sql`, `004_r1_remove_auth_add_lookup.sql`, `005_r1_finalize_lookup.sql`, `006_r3_admin_products.sql`. Chạy toàn bộ theo thứ tự qua migration runner; migration 004 gỡ các bảng tài khoản legacy của migration 003. Image `v1` chỉ được coi là đã phát hành sau khi workflow release push thành công lên Docker Hub.
