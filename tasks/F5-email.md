# F5 — Email: quên mật khẩu và thông báo đơn hàng

**Trạng thái:** chưa làm. **Ước lượng:** 3–4 giờ. **Phụ thuộc:** F4.

## Mục tiêu

Có lớp Mailer gửi email cho: đặt lại mật khẩu, xác nhận đặt đơn, đổi trạng thái đơn. Môi trường local không gửi email thật. Production gửi qua SMTP (AWS SES SMTP hoặc nhà cung cấp SMTP khác).

## Phạm vi file

`apps/api/src/lib/mailer.ts` (mới), `apps/api/src/modules/auth/` (forgot/reset), `apps/api/src/modules/orders/` (gửi thông báo), migration mới `password_resets` và `email_outbox`, `apps/web/src/features/account/` (trang quên/đặt lại mật khẩu), checkout (thêm trường email người nhận nếu contract chưa có), `.env.example`, contract, docs, `tests/email.mjs`.

## Thiết kế bắt buộc

- Thêm dependency `nodemailer` (đã được duyệt trong roadmap D4). `MAIL_DRIVER=log|smtp`.
  - `log`: ghi file `.eml` vào `storage/outbox/` (đã gitignore), **không** in nội dung ra console.
  - `smtp`: dùng `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
- **Outbox pattern:** nghiệp vụ chỉ INSERT vào bảng `email_outbox` (to, template, payload JSON, status, attempts, next_attempt_at) **trong cùng transaction** với đơn hoặc trạng thái. Một worker chạy cùng tiến trình API (`setInterval`, chỉ chạy một instance, dùng `GET_LOCK` hoặc `SELECT ... FOR UPDATE SKIP LOCKED`) lấy bản ghi và gửi, thử lại tối đa 5 lần với backoff. Lỗi gửi mail **không** làm hỏng request đặt đơn.
- **Quên mật khẩu:**
  - `POST /api/auth/password/forgot` {email} **luôn trả 204**, kể cả khi email không tồn tại (không lộ tài khoản). Rate limit theo IP và email.
  - Token là 32 byte ngẫu nhiên, DB chỉ lưu hash. Hết hạn sau 30 phút, chỉ dùng được một lần. Link dạng `/reset-password#token` (fragment, giống tracking).
  - `POST /api/auth/password/reset` {token, newPassword}: đổi mật khẩu, đánh dấu token đã dùng, **xóa mọi session** của user đó.
- **Thông báo đơn:** gửi tới email người nhận (nếu có) hoặc email tài khoản. Nội dung gồm mã đơn, tổng tiền, trạng thái và link tracking. Link tracking chỉ có trong email xác nhận đầu tiên, vì token thô chỉ tồn tại tại thời điểm tạo đơn. **Không** đưa URL nhạc hay ảnh vào email.
- Template viết bằng HTML đơn giản kèm bản text, tiếng Việt, escape mọi dữ liệu người dùng nhập.
- Không log địa chỉ email đầy đủ hay token trong log ứng dụng.

## Test bắt buộc

- Forgot với email có và không có tài khoản đều trả 204. Chỉ trường hợp có tài khoản sinh outbox.
- Reset bằng token đúng → đăng nhập bằng mật khẩu mới được. Dùng lại token → 400. Token hết hạn → 400. Sau reset, session cũ bị hủy.
- Tạo đơn sinh đúng 1 bản ghi outbox trong cùng transaction. Nếu transaction tạo đơn rollback thì không có outbox.
- Worker với driver `log` ghi file. Gửi lỗi (driver giả lập throw) thì tăng `attempts` và không mất bản ghi.
- Template escape `<script>` trong tên người nhận.

## Hoàn thành khi

Mọi test qua, có UI quên/đặt lại mật khẩu, README có hướng dẫn cấu hình SMTP (ghi chú về AWS SES sandbox: phải xác minh địa chỉ người gửi và người nhận cho tới khi được duyệt ra production). Báo cáo phải ghi rõ **chưa kiểm tra gửi email thật** nếu chưa có thông tin SMTP.

## Prompt giao việc

```text
Thực hiện task F5 trong tasks/F5-email.md. Đọc tasks/00-ROADMAP-v2.md, AGENTS.md, docs/03, contracts/openapi.json, module auth/orders sau F3 và UI account sau F4.

Xây Mailer (log|smtp bằng nodemailer) theo outbox pattern ghi cùng transaction, worker gửi có retry, quên/đặt lại mật khẩu bằng token hash dùng một lần qua fragment URL, email xác nhận đơn và đổi trạng thái. Forgot luôn trả 204. Không đưa URL nhạc hay ảnh vào email, không log token hay email đầy đủ. Không gửi email thật trong test.

Viết các integration test bắt buộc trên MySQL. Cập nhật contract, docs, .env.example và README. Chạy typecheck, build, contract:check và mọi test. Viết báo cáo docs/qa/<ngày>-task-F5.md, commit trên nhánh feat/F5-email. Không push.
```
