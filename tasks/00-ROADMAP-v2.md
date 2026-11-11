# Roadmap v2 — từ MVP demo đến website hoàn chỉnh, đóng gói Docker

Lập ngày 11/11/2026. F0 đã chốt phạm vi v2 trong tài liệu và contract 0.3.0; code vẫn là MVP tới các task chuyển đổi. Xem [báo cáo F0](../docs/qa/2026-11-11-task-F0.md). Ưu tiên hoàn thành khung chức năng theo plan; giữ giao diện hiện có để chỉnh sau, không thêm task thiết kế làm điều kiện chặn.

## Quyết định đã chốt cho v2

| # | Quyết định | Ghi chú |
|---|---|---|
| D1 | Cơ sở dữ liệu là **MySQL 8.4** qua driver `mysql2`. Bỏ PostgreSQL và PGlite. | Người dùng yêu cầu. Dữ liệu demo cũ không được chuyển, tạo DB mới từ migration MySQL. |
| D2 | Có hai role `user` và `admin` trong một bảng `users`. Session dùng cookie HttpOnly lưu trong DB. | Bỏ cơ chế admin bằng `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH` trong env. |
| D3 | **Vẫn cho đặt hàng không cần tài khoản.** Khi đã đăng nhập, đơn được gắn `user_id`. | Link tracking `/track#token` giữ nguyên. |
| D4 | Không thêm ORM, không thêm framework UI hay router. Thư viện mới chỉ được thêm khi task ghi rõ: `mysql2` (F2), `nodemailer` (F5), `qrcode` (F8, tùy chọn), `@aws-sdk/client-s3` (G1b, tùy chọn). | Thư viện khác phải hỏi người dùng. |
| D5 | Đầu ra cuối cùng của dự án là **image Docker kèm `compose.prod.yaml` và tài liệu bàn giao**. Việc đưa lên server AWS (hạ tầng, DNS, TLS, backup storage, giám sát) do **người vận hành khác** đảm nhận. | Agent không viết runbook hay script hạ tầng AWS và không thao tác lên tài khoản cloud. |
| D6 | Thanh toán (F8) là **tùy chọn**, chỉ làm khi người dùng xác nhận. S3 (G1b) chỉ làm khi **người vận hành yêu cầu**. | |

Nếu người dùng đổi quyết định nào, sửa bảng này và các task bị ảnh hưởng trước khi giao việc.

## Thứ tự và phụ thuộc

```text
F0 Chốt phạm vi v2 (docs, AGENTS.md, OpenAPI 0.3.0)
 └─ F1 Gỡ API legacy /api/demo-*
     └─ F2 Chuyển sang MySQL (adapter, schema, migrate, tests)
         └─ F3 Users & roles (backend)
             ├─ F4 Tài khoản user (frontend)
             │   ├─ F5 Email: quên mật khẩu + thông báo đơn
             │   └─ F7 Trang nội dung, router, SEO
             │       └─ F8 (tùy chọn) Thanh toán chuyển khoản VietQR
             └─ F6 Admin mở rộng: sản phẩm, user, thống kê, CSV
G1 Docker production (bắt đầu được sau F2; hoàn tất sau F7)
 ├─ G1b (tùy chọn, theo yêu cầu người vận hành) Lưu upload trên S3
 └─ G2 CI GitHub Actions + đẩy image lên registry
     └─ G3 Hồ sơ bàn giao Docker cho người vận hành
                → người vận hành tự đưa lên AWS (ngoài phạm vi roadmap)
H  Nghiệm thu toàn bộ v2 (sau tất cả các task trên)
```

| Task | File | Ước lượng | Phụ thuộc |
|---|---|---|---|
| F0 | [F0-scope-v2.md](F0-scope-v2.md) | 1–2 giờ | — |
| F1 | [F1-remove-legacy.md](F1-remove-legacy.md) | 1 giờ | F0 |
| F2 | [F2-mysql.md](F2-mysql.md) | 4–6 giờ | F1 |
| F3 | [F3-auth-roles-api.md](F3-auth-roles-api.md) | 4–6 giờ | F2 |
| F4 | [F4-account-ui.md](F4-account-ui.md) | 3–5 giờ | F3 |
| F5 | [F5-email.md](F5-email.md) | 3–4 giờ | F4 |
| F6 | [F6-admin-extended.md](F6-admin-extended.md) | 4–6 giờ | F3 |
| F7 | [F7-content-seo.md](F7-content-seo.md) | 3–4 giờ | F4 |
| F8 | [F8-payment-vietqr.md](F8-payment-vietqr.md) | 3–4 giờ | F7 (tùy chọn) |
| G1 | [G1-docker.md](G1-docker.md) | 3–4 giờ | F2 |
| G1b | [G1b-s3-storage.md](G1b-s3-storage.md) | 2–3 giờ | G1 (tùy chọn) |
| G2 | [G2-ci.md](G2-ci.md) | 1–2 giờ | G1 |
| G3 | [G3-docker-handoff.md](G3-docker-handoff.md) | 1,5–2 giờ | G2 |
| H | [H-acceptance-v2.md](H-acceptance-v2.md) | 3–5 giờ | tất cả |

Thời lượng chỉ là ước lượng, không phải cam kết.

## Quy tắc chung cho mọi agent (Codex)

1. **Mỗi lần chỉ làm một task, trên một checkout.** Không chạy song song hai task trên cùng thư mục.
2. Trước khi sửa: đọc `AGENTS.md`, `README.md`, file roadmap này, file task được giao và các docs mà task liệt kê. Chạy `git status` và kiểm tra task phụ thuộc đã có báo cáo hoàn thành trong `docs/qa/`.
3. Tạo nhánh `feat/<mã-task>-<tên-ngắn>` từ `main` (ví dụ `feat/F2-mysql`). Commit nhỏ, message tiếng Anh dạng `feat:`/`fix:`/`docs:`/`test:`. **Không push và không merge** nếu người dùng chưa yêu cầu.
4. Hợp đồng API nằm ở `contracts/openapi.json`. Đổi endpoint thì sửa contract, docs/03 và tests trong cùng task. Không đánh dấu endpoint là đã có khi chưa triển khai.
5. SQL luôn dùng tham số. Ghi trạng thái và lịch sử trong cùng transaction. Truy cập DB qua adapter `apps/api/src/db.ts`. Khi migration đã được áp dụng thì thêm migration mới, không sửa file cũ.
6. Không log mật khẩu, token, cookie, body đặt hàng hay URL nhạc. Không commit `.env*` (trừ `.env.example`), `.local-admin.txt`, `storage/`, `node_modules/`, `.npm-cache/`.
7. Mỗi nghiệp vụ auth, phân quyền, tạo đơn hay state machine phải có **integration test chạy trên MySQL thật**. Không viết test chỉ để khớp mock.
8. Điều kiện Done chung: `npm run typecheck`, `npm run build`, `npm run contract:check` và toàn bộ test suite đều qua. Ghi lệnh cùng kết quả thực đo vào `docs/qa/<YYYY-MM-DD>-task-<mã>.md`.
9. Báo cáo phải ghi rõ những gì **chưa** kiểm tra được (trình duyệt thật, server của người vận hành, email thật...). Chưa chạy thì không ghi là PASS.
10. Cập nhật dòng trạng thái ở đầu file task và bảng "Đã có / cần làm tiếp" trong README.
11. Gặp mâu thuẫn giữa task và code/contract: dừng phần bị ảnh hưởng, ghi lại trong báo cáo, đề xuất cách sửa. Không tự mở rộng phạm vi.

Ghi chú chuyển tiếp F0: `main` còn thiếu 12 commit MVP A–E, nên nhánh `feat/F0-scope-v2` được tạo từ `refactor/clean-layout` tại `4ec95d8` để giữ nền mã đã kiểm tra; không merge hoặc cập nhật `main`. Từ F1, tiếp tục trên nền đã có F0 và các task phụ thuộc, không tạo nhánh từ `main` cũ làm mất chúng. Chỉ dùng `main` khi đã chứa nền cần thiết. Trước F2, quy tắc test MySQL ở mục 7 chưa áp dụng cho hồi quy MVP; F0/F1 chạy các suite DB thử hiện có.

## Mẫu báo cáo `docs/qa/<ngày>-task-<mã>.md`

```markdown
# Task <mã> — <tên>
Ngày: · Nhánh: · Commit cuối:
## Đã làm
## File chính đã sửa
## Lệnh kiểm tra và kết quả thực đo (dán output rút gọn)
## Chưa kiểm tra / giới hạn còn lại
## Ảnh hưởng tới task sau
```
