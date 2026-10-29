# Kết quả kiểm tra bộ khởi tạo

Ngày: 27/10/2026 (Asia/Saigon). Môi trường kiểm tra: Windows, Node v24.20.0, npm 11.19.0. Đây là kiểm tra starter; không phải nghiệm thu MVP bán hàng.

| Hạng mục | Kết quả thực tế |
|---|---|
| Cài dependency với npm install --ignore-scripts | Đạt; có package-lock.json |
| npm run typecheck | Đạt: scripts, API và web |
| npm run build | Đạt: API JS và Vite web bundle |
| npm run contract:check | Đạt OpenAPI 3.1.0, 9 paths / 10 operations |
| npm run setup | Tạo cấu hình local và thông tin admin riêng; không đưa vào ZIP |
| npm run db:migrate | PGlite: áp dụng 001_initial.sql và 002_seed_demo.sql |
| Chạy migration lần hai | Bỏ qua hai file đã áp dụng, không tạo lại schema |
| npm run db:check | Đọc được đúng một sản phẩm demo 50.000 VND |
| Adapter transaction | Ghi thử sản phẩm trong transaction rồi ném lỗi: rollback, không còn dòng thử |
| Mở lại database | Đóng/mở adapter vẫn đọc được sản phẩm seed trên đĩa |
| HTTP health | 200 và service=harmea-api |
| Endpoint nghiệp vụ chưa làm | 404, không giả thành công |
| npm run dev | API và Vite khởi động thành công |
| GET localhost:5173 | HTTP 200; trang trống có chủ đích, chưa có UI sản phẩm |
| GET localhost:5173/api/health | HTTP 200 qua Vite proxy |
| Compose | Parse YAML thành công, có service PostgreSQL và volume; chưa chạy container |

Đã dừng hai dev server sau kiểm tra; không để chiếm cổng 4000/5173. Chạy lại bằng `npm.cmd run dev`.

## Giới hạn và việc còn lại

- Không phát hiện Docker CLI/engine sẵn dùng trong phiên kiểm tra. PostgreSQL server adapter và container cần được kiểm tra khi người dùng bật Docker. PGlite chạy được không thay thế phép kiểm tra đó.
- API tạo đơn, auth/admin, tracking, upload và toàn bộ UI nghiệp vụ vẫn chưa triển khai. Checklist AT-01…AT-20 trong docs/04 vẫn **Chưa chạy**.
- Chưa có kiểm tra tải, triển khai public, chứng nhận file in hay thử phần cứng NFC.
- Đã thay công cụ runtime tsx gây lỗi os.userInfo trong môi trường Windows này bằng khả năng chạy TypeScript trực tiếp của Node 24; không yêu cầu sửa policy hệ thống.
- Build web chỉ kiểm tra toolchain, không phải kiểm tra trực quan giao diện.

Tiếp tục từ `tasks/A-api-data.md`, rồi cập nhật báo cáo bằng kết quả thực đo khi triển khai xong từng phần.
