# Hướng dẫn làm việc với Harméa v2

- Người dùng làm một mình. Mốc demo 28/10/2026 và phạm vi MVP 29/10/2026 là lịch sử; mục tiêu v2 là website hoàn chỉnh đóng gói Docker (image, compose và tài liệu bàn giao); người vận hành khác triển khai server. Đọc README, docs/01–05 và task được giao trước khi sửa.
- Thứ tự công việc theo `tasks/00-ROADMAP-v2.md`. Mỗi lần làm một task trên một checkout. Ưu tiên hoàn thành khung chức năng theo plan; dùng giao diện hiện có, có thể chỉnh thiết kế sau.
- Stack đích: React/TypeScript/Vite + Express/TypeScript + MySQL 8.4 qua `mysql2`. F0 chỉ cập nhật tài liệu/contract; code và cách chạy hiện tại giữ nguyên đến F2, xem README. Không chuyển dữ liệu demo cũ sang DB mới.
- Không tự thêm ORM/framework/dịch vụ hoặc thư viện UI/router. Chỉ thêm dependency được ghi rõ trong task: mysql2 ở F2, nodemailer ở F5; qrcode ở F8 và @aws-sdk/client-s3 ở G1b chỉ khi task tùy chọn được chọn (F8 do người dùng, G1b theo yêu cầu người vận hành). Thư viện khác phải hỏi người dùng.
- Phạm vi: một sản phẩm/mẫu, admin chỉnh giá/mô tả/bật tắt; giữ giỏ hàng; mỗi đơn 1–10 thiết kế, mỗi thiết kế 1–10 bản. Khách vẫn đặt hàng không cần tài khoản; khi đăng nhập thì gắn đơn với user. Hai role user/admin, có thể nhiều admin. Thanh toán và S3 là tùy chọn, chưa được chọn.
- API lấy `contracts/openapi.json` làm chuẩn; schema SQL trong `database/`. Contract 0.3.0 có endpoint hiện có và endpoint `x-status: planned`; không đánh dấu endpoint kế hoạch là đã triển khai. /api/demo-* là legacy deprecated, không trộn với đơn canonical/admin; F1 gỡ legacy, F3 thay admin session cũ.
- Sau khi migration đã áp dụng, thêm migration mới; không sửa nội dung file cũ để né checksum. F2 tạo bộ MySQL mới và lưu nguyên file SQL cũ vào thư mục lịch sử.
- Dùng query có tham số. Ghi trạng thái và lịch sử bằng cùng transaction. Truy cập bảng qua adapter trong `apps/api/src/db.ts`.
- Đơn lưu snapshot; không tính giá từ client; không sửa thiết kế/giá của đơn đã gửi.
- Mật khẩu hash bằng scrypt. Session ngẫu nhiên chỉ lưu hash trong DB, cookie HttpOnly + SameSite=Lax + Secure khi HTTPS. Không lưu session vào localStorage/sessionStorage. Phân quyền kiểm tra ở server; user chỉ đọc đơn của mình, admin mới được dùng API quản trị. Không để hệ thống còn 0 admin active.
- Không phục vụ public `storage/uploads`. Mọi endpoint admin và tệp phải xác thực server-side. Không log token, mật khẩu, cookie, body đặt hàng hay URL nhạc.
- Link tra cứu /track#token dùng fragment; POST lookup chuyển token trong body; public response dùng allowlist. Link đặt lại mật khẩu cũng dùng fragment; token dùng một lần, lưu hash và có hạn.
- .env và các file env chứa bí mật, .local-admin.txt, storage, node_modules và .npm-cache không được commit hoặc đưa vào ZIP bàn giao. File env mẫu chỉ chứa placeholder được phép commit.
- Kiểm tra yêu cầu input, decode ảnh thực, giới hạn bộ nhớ/kích thước; UI validation không thay backend.
- Không copy toàn bộ tài nguyên thương hiệu/mã CMIYGL. Dùng repo đó làm tham khảo; xây mẫu Harméa bằng tài nguyên có quyền sử dụng.
- Hoàn thành task phải typecheck/build, contract:check và kiểm tra luồng liên quan. Với nghiệp vụ tạo đơn/auth/phân quyền/state machine, thêm integration tests có ý nghĩa trên MySQL thật từ F2; không viết test chỉ khớp mock. Trước F2, chạy bộ hồi quy hiện có trên DB thử riêng theo README.
- Ghi kết quả thực tế và giới hạn vào báo cáo/README; không điền checklist như đã PASS nếu chưa chạy. Không push/merge nếu người dùng chưa yêu cầu.
- Agent chỉ viết cấu hình Docker, script backup/restore ở mức ứng dụng và hồ sơ bàn giao. Không viết runbook/script hạ tầng AWS; không đăng nhập tài khoản AWS, không chạy AWS CLI trên tài khoản thật, không tạo tài nguyên cloud. Không sửa Google Doc nguồn.
