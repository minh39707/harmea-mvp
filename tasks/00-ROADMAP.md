# Roadmap v2 (bản rút gọn) — website không đăng nhập, đóng gói Docker

Cập nhật 11/11/2026. **Người dùng đã bỏ toàn bộ đăng nhập (khách và admin).** Dữ liệu sản phẩm và đơn hàng lưu trong MySQL theo **mã đơn hàng**. Khách tra cứu đơn bằng **mã đơn + số điện thoại**. Các task F3–F8, F4b, F4c cũ đã hủy và bị xóa (bản đã commit vẫn còn trong lịch sử git).

## Cấu trúc thư mục `tasks/`

```text
tasks/
├── 00-ROADMAP.md                         ← đọc trước
├── 01-R1-no-login-order-lookup.md        ← làm tiếp theo
├── 02-R2-device-cart-photo-compression.md
├── 03-R3-admin-products-stats.md
├── 04-R4-content-seo.md
├── 05-R5-payment-vietqr-optional.md      (tùy chọn)
├── 06-G1-docker.md
├── 07-G1b-s3-storage-optional.md         (tùy chọn, chỉ khi bên server yêu cầu)
├── 08-G2-ci-dockerhub.md
├── 09-G3-deploy-handoff.md
├── 10-H-acceptance.md
└── done/                                 lịch sử: A–E (MVP), F0–F2 (v2 đã xong), không giao lại
```

Làm theo số thứ tự từ 01 đến 10, bỏ qua các file có đuôi `-optional` nếu không dùng.

## Quyết định đã chốt

| # | Quyết định | Ghi chú |
|---|---|---|
| D1 | Cơ sở dữ liệu **MySQL 8.4** qua `mysql2`. | F2 đã làm xong. |
| D2 | **Không có tài khoản và không có đăng nhập** cho khách lẫn admin. Không có bảng `users` hay `sessions`, không có cookie phiên. | Thay cho D2/D3 cũ. |
| D3 | Mỗi đơn có **mã đơn** (`order_number`, dạng `HM-…`, duy nhất). Khách tra cứu bằng **mã đơn + SĐT người nhận**. **Bỏ link bí mật `/track#token`.** Trang tra cứu chỉ hiện thông tin công khai (allowlist). | Có giới hạn số lần thử để chống dò SĐT. |
| D4 | **Admin không đăng nhập trong app**, nhưng trang admin chứa dữ liệu cá nhân nên **mặc định tắt** khi `NODE_ENV=production`. Chỉ bật bằng `ADMIN_ENABLED=true` **sau khi** người vận hành đã chặn `/admin*` và `/api/admin*` ở Caddy (basic auth hoặc giới hạn IP). Dev local bật sẵn. | Bảo vệ đặt ở proxy; app tắt admin khi chưa bật (fail-closed). |
| D5 | Giỏ hàng và ảnh của khách **lưu trên thiết bị** (localStorage/IndexedDB như hiện tại). Server chỉ nhận ảnh khi đặt đơn. Khách lưu được nhiều thẻ, chỉnh tiếp sau khi lưu. Ảnh **được nén** trước khi lưu và khi đặt đơn. | Kho ảnh trên server (F4b/F4c cũ) đã hủy. |
| D6 | Không gửi email. Trang đặt hàng thành công hiện mã đơn để khách lưu lại. | F5 cũ đã hủy. |
| D7 | Đầu ra cuối là image `linux/amd64` trên Docker Hub (`<user>/harmea-web:vN`), `docker-compose.yml` (app + MySQL), `.env.example`, `DEPLOY.md` và file `.env` thật gửi riêng. Server có sẵn: EC2 t3.large, Amazon Linux 2023, Docker 25, Caddy lo HTTPS cho `https://harmea.introd.xyz` và gọi `app:3000` qua network external `web`. | Agent không viết Caddy hay hạ tầng, không thao tác lên server, không push image. |
| D8 | Không ORM, không framework hay router mới. Thư viện mới chỉ được thêm khi task ghi rõ (`qrcode` cho R5 tùy chọn, `@aws-sdk/client-s3` cho G1b tùy chọn). | |
| D9 | Thanh toán (R5) và S3 (G1b) là tùy chọn. | |

## Thứ tự

```text
F0 ✔ Chốt phạm vi v2 (đã commit)
F1 ✔ Gỡ API legacy (đã commit)
F2 ✔ Chuyển sang MySQL (xong, chưa commit)
 └─ R1 Gỡ tài khoản và đăng nhập; tra cứu đơn bằng mã + SĐT; admin không login, fail-closed
     ├─ R2 Giỏ nhiều thẻ trên thiết bị + nén ảnh
     ├─ R3 Admin mở rộng: sản phẩm/giá, thống kê, xuất CSV
     └─ R4 Router, trang nội dung, SEO
         └─ R5 (tùy chọn) Thanh toán chuyển khoản VietQR
G1 ✔ Đóng gói Docker runtime (CI Linux và Docker local đã qua; xem kết quả H)
 ├─ G1b (tùy chọn) Lưu upload trên S3
 └─ G2 CI + smoke /health + đẩy image lên Docker Hub
     └─ G3 DEPLOY.md + script sinh .env production + backup/restore
H  Nghiệm thu toàn bộ
```

| # | Task | File | Ước lượng | Phụ thuộc | Trạng thái |
|---|---|---|---|---|---|
| — | F0, F1, F2 | [done/](done/) | — | — | Xong |
| 01 | R1 | [01-R1-no-login-order-lookup.md](01-R1-no-login-order-lookup.md) | 3–4 giờ | F2 | Xong; xem [báo cáo R1](../docs/qa/2026-11-11-task-R1.md) |
| 02 | R2 | [02-R2-device-cart-photo-compression.md](02-R2-device-cart-photo-compression.md) | 3–5 giờ | R1 | Đã triển khai; browser/client QA còn chờ ([báo cáo](../docs/qa/2026-11-11-task-R2.md)) |
| 03 | R3 | [03-R3-admin-products-stats.md](03-R3-admin-products-stats.md) | 3–4 giờ | R1 | Đã triển khai; integration MySQL qua, còn browser QA ([báo cáo](../docs/qa/2026-11-11-task-R3.md)) |
| 04 | R4 | [04-R4-content-seo.md](04-R4-content-seo.md) | 3–4 giờ | R1 | Đã triển khai; browser QA còn chờ ([báo cáo](../docs/qa/2026-11-11-task-R4.md)) |
| 05 | R5 (tùy chọn) | [05-R5-payment-vietqr-optional.md](05-R5-payment-vietqr-optional.md) | 3 giờ | R4 | 12/11: bản rút gọn QR tĩnh + khách tự báo chuyển khoản; R5 đầy đủ vẫn planned. [Báo cáo](../docs/qa/2026-11-12-qr-local.md) |
| 06 | G1 | [06-G1-docker.md](06-G1-docker.md) | 3–4 giờ | R1 | CI Linux và Docker local đã qua; xem [H](../docs/qa/2026-11-11-acceptance.md) |
| 07 | G1b (tùy chọn) | [07-G1b-s3-storage-optional.md](07-G1b-s3-storage-optional.md) | 2–3 giờ | G1 | MinIO/S3 đã qua CI và local; AWS thật chưa kiểm tra ([H](../docs/qa/2026-11-11-acceptance.md)) |
| 08 | G2 | [08-G2-ci-dockerhub.md](08-G2-ci-dockerhub.md) | 1,5–2 giờ | G1 | CI/release xanh; image v1 đã phát hành. H phát hiện lỗi cần sửa trước bàn giao ([H](../docs/qa/2026-11-11-acceptance.md)) |
| 09 | G3 | [09-G3-deploy-handoff.md](09-G3-deploy-handoff.md) | 1,5–2 giờ | G2 | Backup/restore qua CI Linux; persistence Docker local qua; chưa chạy server ([H](../docs/qa/2026-11-11-acceptance.md)) |
| 10 | H | [10-H-acceptance.md](10-H-acceptance.md) | 3–4 giờ | tất cả | v1.1.0 đã phát hành, CI/browser đúng digest PASS; còn ảnh điện thoại thật/Excel và server ([release](../docs/qa/2026-11-11-release-v1.1.0.md)) |

Thời lượng chỉ là ước lượng.

## Trạng thái working tree khi bắt đầu R1

Chưa có commit nào sau F1 (`98ba814`). Working tree đang chứa lẫn:
- **F2 (MySQL)**: giữ lại.
- **Các thay đổi giao diện storefront** (home, gallery, footer, ảnh mới): giữ lại, không thuộc task nào.
- **Code F3/F4 đã hủy** (users, sessions, auth, me, account UI, admin login mới): **R1 phải gỡ sạch**.

Báo cáo `docs/qa/2026-11-11-task-F3.md` và `task-F4.md` giữ lại làm lịch sử; đầu mỗi file thêm một dòng "Đã hủy, xem R1".

## Quy tắc chung cho mọi agent (Codex)

1. **Mỗi lần chỉ làm một task, trên một checkout.**
2. Trước khi sửa: đọc `AGENTS.md`, `README.md`, file roadmap này, file task được giao và các docs mà task liệt kê. Kiểm tra task phụ thuộc đã có báo cáo trong `docs/qa/`. Working tree có thay đổi chưa commit của các task trước; đó là bình thường, **không dọn**.
3. **Agent không commit, không tạo nhánh, không stash, không reset, không push.** Claude sẽ kiểm tra từng task theo điều kiện Done rồi mới commit. Task sau phải sửa file của task trước thì ghi rõ trong báo cáo.
4. Hợp đồng API là `contracts/openapi.json`. Đổi endpoint thì sửa contract, docs/03 và tests trong cùng task.
5. SQL luôn dùng tham số. Ghi trạng thái và lịch sử trong cùng transaction. Truy cập DB qua `apps/api/src/db.ts`. Migration đã áp dụng ở bất kỳ DB bền nào (gồm DB local của người dùng) thì không sửa nữa, phải thêm migration mới.
6. Không log SĐT, địa chỉ, body đặt hàng hay URL nhạc. Không commit `.env*` (trừ `.env.example`), `storage/`, `node_modules/`, `.npm-cache/`.
7. Nghiệp vụ tạo đơn, tra cứu, state machine và quyền admin (gate) phải có **integration test trên MySQL thật**.
8. Done chung: `typecheck`, `build`, `contract:check`, **`format:check`** và toàn bộ test suite đều qua. Chỉ chạy Prettier trên các file task mình sửa (không format toàn repo để tránh đụng thay đổi UI chưa commit), trừ khi task ghi khác.
9. Báo cáo ghi rõ những gì **chưa** kiểm tra được (trình duyệt thật, Docker, server). Chưa chạy thì không ghi PASS.
10. Cập nhật dòng trạng thái ở đầu file task và bảng trạng thái trong README.
11. Gặp mâu thuẫn giữa task và code/contract: dừng phần bị ảnh hưởng, ghi lại trong báo cáo, đề xuất cách sửa. Không tự mở rộng phạm vi.

## Mẫu báo cáo `docs/qa/<ngày>-task-<mã>.md`

```markdown
# Task <mã> — <tên>
Ngày: · Nhánh: · Commit nền (HEAD khi bắt đầu):
## Đã làm
## File đã tạo / sửa / xóa trong task này (đánh dấu file của task trước bị sửa lại)
## Migration mới (nếu có)
## Lệnh kiểm tra và kết quả thực đo
## Chưa kiểm tra / giới hạn còn lại
## Ảnh hưởng tới task sau
```
