# Hướng dẫn làm việc với Harméa MVP

- Người dùng đang làm một mình; mốc demo 28/10/2026. Đọc README, docs/01–05 và task được giao trước khi sửa.
- Phạm vi đã chốt 29/10/2026: một sản phẩm/mẫu, giữ giỏ hàng; mỗi đơn 1–10 thiết kế, mỗi thiết kế 1–10 bản; khách không tài khoản/thanh toán; admin một tài khoản; tracking riêng tư. Thay phạm vi một thiết kế/không giỏ hàng ban đầu.
- Stack đã chấp nhận: React/TypeScript/Vite + Express/TypeScript + PostgreSQL. PGlite là chế độ demo local. Không tự thêm ORM/framework/dịch vụ.
- API lấy `contracts/openapi.json` làm chuẩn; schema SQL trong `database/`. Starter chỉ có health; task A bổ sung API đơn multipart/admin. `/api/demo-*` là legacy tạm cho frontend cũ, không trộn với đơn canonical/admin. Không đánh dấu endpoint kế hoạch là đã triển khai.
- Sau khi migration đã áp dụng, thêm migration mới; không sửa nội dung file cũ để né checksum.
- Dùng query có tham số. Ghi trạng thái và lịch sử bằng cùng transaction. Truy cập bảng qua adapter trong `apps/api/src/db.ts`.
- Đơn lưu snapshot; không tính giá từ client; không sửa thiết kế/giá của đơn đã gửi.
- Không phục vụ public `storage/uploads`. Mọi endpoint admin và tệp phải xác thực server-side. Không log token, mật khẩu, body đặt hàng hay URL nhạc.
- Link tra cứu `/track#token` dùng fragment; POST lookup chuyển token trong body; public response dùng allowlist. Không localStorage cho admin session.
- `.env`, `.local-admin.txt`, storage, node_modules và .npm-cache không được commit hoặc đưa vào ZIP bàn giao.
- Kiểm tra yêu cầu input, decode ảnh thực, giới hạn bộ nhớ/kích thước; UI validation không thay backend.
- Không copy toàn bộ tài nguyên thương hiệu/mã CMIYGL. Dùng repo đó làm tham khảo; xây mẫu Harméa bằng tài nguyên có quyền sử dụng.
- Hoàn thành task phải typecheck/build và kiểm tra luồng liên quan. Với nghiệp vụ tạo đơn/auth/state machine, thêm integration tests có ý nghĩa; không viết test chỉ khớp một mock.
- Ghi kết quả thực tế và giới hạn vào báo cáo/README; không điền checklist như đã PASS nếu chưa chạy.
- Chưa được yêu cầu triển khai cloud hoặc sửa Google Doc nguồn.
