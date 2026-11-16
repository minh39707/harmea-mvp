# Nơi triển khai module nghiệp vụ

Runtime hiện có `catalog`, `orders` (gồm lookup tracking và quản lý đơn) và `admin` (sản phẩm, thống kê, CSV).
Không có module auth, me hoặc user. API admin được bảo vệ bởi `ADMIN_ENABLED` ở app root.
Mỗi module chỉ cần router, service và repository khi có nhu cầu thực tế.
Truy vấn dùng SQL có tham số qua adapter `../../db.ts`; hợp đồng chuẩn ở `contracts/openapi.json`.
