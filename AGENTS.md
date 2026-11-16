# Hướng dẫn làm việc với Harméa MVP

- Đọc README, docs/01–05 và task được giao trước khi sửa. Thứ tự hiện hành trong `tasks/00-ROADMAP.md`; làm từng task trong một checkout.
- Người dùng làm một mình. Working tree có thể chứa thay đổi task chưa commit; giữ nguyên phần ngoài task, không dọn/reset/stash.
- Phạm vi đã chốt 11/11/2026: một sản phẩm/mẫu; giữ giỏ hàng; mỗi đơn 1–10 thiết kế, mỗi thiết kế 1–10 bản; khách không tài khoản/thanh toán; tra cứu bằng mã đơn + SĐT; admin không đăng nhập trong app.
- Stack: React/TypeScript/Vite + Express/TypeScript + MySQL 8.4/mysql2. PGlite/PostgreSQL legacy chỉ để đọc; không tự thêm ORM/framework/router/dịch vụ.
- API lấy `contracts/openapi.json` làm chuẩn; schema SQL trong `database/`. Phân biệt `implemented` và `planned`; không đánh dấu endpoint kế hoạch là đã triển khai.
- Sau khi migration đã áp dụng, thêm migration mới; không sửa nội dung file cũ để né checksum. DB thao tác qua adapter `apps/api/src/db.ts`.
- Dùng SQL có tham số. Ghi trạng thái và history event bằng cùng transaction. Đơn lưu snapshot; không tính giá từ client và không sửa thiết kế/giá đơn đã gửi.
- Không có bảng user/session, cookie phiên hoặc API đăng nhập. Admin gate `ADMIN_ENABLED` mặc định tắt ở production; khi bật phải được bảo vệ ở reverse proxy do người vận hành cấu hình. Khi tắt, `/admin*` và `/api/admin*` trả 404 chung.
- Không phục vụ public `storage/uploads`. Tệp đơn chỉ truy cập qua API admin sau gate. Không log SĐT, địa chỉ, body đặt hàng, URL nhạc, secret hoặc cookie.
- Lookup nhận mã đơn + SĐT trong POST body. Chuẩn hóa và HMAC SĐT bằng `LOOKUP_SECRET`, so sánh timing-safe, trả lỗi 404 chung và giới hạn lượt sai. Không dùng token/fragment/query string để tra cứu.
- `sessionStorage` chỉ dùng cho request key + fingerprint checkout chưa rõ kết quả theo task C; không lưu session/token, raw phone, địa chỉ, body đặt hàng hoặc URL nhạc.
- `.env`, `.local-admin.txt`, storage, node_modules và .npm-cache không được commit hoặc đưa vào ZIP bàn giao. `.env.example` chỉ chứa placeholder công khai.
- Kiểm tra đầu vào ở server, decode ảnh thật, giới hạn bộ nhớ/kích thước; UI validation không thay backend.
- Không copy toàn bộ tài nguyên thương hiệu/mã CMIYGL. Dùng repo đó làm tham khảo; dùng tài nguyên có quyền sử dụng.
- Hoàn thành task phải typecheck, build, contract:check, format:check và kiểm tra luồng liên quan theo task. Tạo integration tests có ý nghĩa trên MySQL thật cho nghiệp vụ tạo đơn, lookup, admin gate và state machine; không kiểm tra bằng mock đơn thuần.
- Ghi kết quả thực tế và giới hạn vào báo cáo/README; không điền checklist là PASS nếu chưa chạy. Ghi rõ phần chưa kiểm tra trên browser/Docker/server.
- Không commit, tạo nhánh, stash, reset, push, triển khai cloud hoặc sửa Google Doc nguồn trừ khi người dùng yêu cầu.
- Agent chỉ viết cấu hình Docker và script backup/restore ở mức ứng dụng trong task được giao. Không viết runbook/script hạ tầng AWS, không đăng nhập tài khoản AWS, không chạy AWS CLI trên tài khoản thật và không tạo cloud resources.
