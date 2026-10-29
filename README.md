# Harméa MVP — bắt đầu tại đây

Bản demo local và tài liệu triển khai cho **một người**; mốc demo ban đầu 28/10/2026. Task A đã có API đơn hàng/admin, frontend hiện vẫn là luồng đặt thử legacy chờ B/C/D nối vào. Không có thanh toán.

## Đã có / cần làm tiếp

| Đã triển khai / chuẩn bị | Cần làm tiếp |
|---|---|
| UI sản phẩm, cá nhân hóa, giỏ hàng, checkout, success và tracking | Kiểm tra thao tác trình duyệt, desktop và mobile |
| Hợp đồng 0.2.0 giữ giỏ: `/api/orders` multipart, `/api/tracking/lookup` | C chuyển frontend khỏi `/api/demo-*`; đơn legacy không tự vào admin mới |
| Backend kiểm tra ảnh/crop/URL, giữ ảnh gốc/preview từng dòng, tính giá và lưu snapshot | B dựng preview PNG và crop/giữ ảnh gốc từ editor |
| Auth cookie, API admin list/detail/assets và status/version/history | D làm UI admin và nghiệm thu qua trình duyệt |
| Migration checksum 001–004, PGlite integration tests, adapter PostgreSQL và Compose | Áp 004 vào DB local sau khi dừng API; kiểm tra PostgreSQL thực tế |
| E Giai đoạn 1 và API task A đã triển khai | B → C → D, rồi E Giai đoạn 2 (redesign) |

Giá seed **50.000 VND là số giả cho demo**. Không có thanh toán hoặc tự động sản xuất/giao hàng. API canonical đã qua **25 tests Node (23 trường hợp con, một test cha và một test nâng migration)** trên PGlite. Bộ smoke legacy lịch sử hiện **30 phép / 25 khớp / 5 không khớp**, không phải bộ nghiệm thu contract mới. Xem [báo cáo task A](docs/qa/2026-10-29-task-a.md). Chưa nghiệm thu toàn MVP hoặc PostgreSQL thực tế.

## Cấu trúc hiện tại

```text
apps/web/src/app/        shell, điều hướng và state chung
apps/web/src/features/   editor, cart, checkout, tracking
apps/web/src/shared/     types, API client, format và UI dùng chung
apps/web/src/styles/     CSS chung, tokens và responsive
apps/api/src/middleware/ headers, Origin và rate limit
apps/api/src/lib/        validation, lỗi và hash
apps/api/src/modules/    catalog, orders, admin; checkout/tracking legacy tạm thời
tests/                  integration API canonical và smoke legacy, DB thử riêng
docs/qa/                báo cáo và bằng chứng kiểm tra
```

CSS của từng feature nằm cạnh component; `styles/index.css` nhập tập trung theo thứ tự cũ để giữ nguyên cascade trong Giai đoạn 1. API admin/orders đã có; các màn hình và dữ liệu frontend mới chưa nối.

## Đọc theo thứ tự

1. [Requirement và phạm vi](docs/01-requirements.md).
2. [Kiến trúc và quyết định kỹ thuật](docs/02-architecture.md).
3. [Dữ liệu, API và quy tắc tích hợp](docs/03-data-api.md); hợp đồng máy đọc được: [OpenAPI](contracts/openapi.json).
4. [Kế hoạch 8–10 giờ dự kiến cho một người](docs/05-solo-plan.md).
5. [Task E](tasks/E-clean-layout.md): Giai đoạn 1 đã tách code; [task A](tasks/A-api-data.md) đã triển khai API; tiếp theo B → C → D → E Giai đoạn 2. Xem [báo cáo E1](docs/qa/2026-10-29-clean-layout.md) và [báo cáo A](docs/qa/2026-10-29-task-a.md).
6. Dùng [checklist demo](docs/04-acceptance-demo.md) để nghiệm thu.

## Chạy trên Windows / PowerShell

Yêu cầu: Node.js 24.x và npm. Chạy mọi lệnh từ thư mục chứa README này. Dùng `npm.cmd` nếu PowerShell chặn `npm.ps1`.

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run setup
```

`setup` tạo `.env` và `.local-admin.txt` với bí mật ngẫu nhiên, giữ nguyên nếu `.env` đã có. API đăng nhập admin dùng cấu hình scrypt này; UI đăng nhập còn task D. Không đưa hai file này vào Git/chia sẻ. `.env.example` là mẫu công khai.

### Cách A — PostgreSQL bằng Docker

1. Mở Docker Desktop, chờ engine sẵn sàng.
2. Trong `.env`, đổi `DB_DRIVER=pglite` thành `DB_DRIVER=postgres`. `DATABASE_URL` đã được setup sinh khớp mật khẩu Compose.
3. Chạy:

```powershell
docker compose up -d --wait db
npm.cmd run db:migrate
npm.cmd run db:check
npm.cmd run dev
```

Compose chạy **database**, còn web/API chạy bằng Node trên máy. PostgreSQL chỉ bind `127.0.0.1:5432`; dữ liệu nằm trong named volume. Dừng bằng `docker compose stop`. Nếu cổng 5432 bị chiếm, đổi cổng bên trái trong Compose và `DATABASE_URL` tương ứng. Không dùng lệnh xóa volume nếu cần giữ đơn.

### Cách B — local dự phòng, không cần Docker

Giữ `DB_DRIVER=pglite` trong `.env`, rồi chạy:

```powershell
npm.cmd run db:migrate
npm.cmd run db:check
npm.cmd run dev
```

PGlite dùng PostgreSQL nhúng, dữ liệu bền tại `storage/db`. Chỉ một tiến trình được mở thư mục DB này: dừng API trước khi chạy migration/check DB sau khi task A đã kết nối database vào API.

**Hai chế độ có kho dữ liệu riêng.** Đổi driver không tự chuyển đơn hoặc tài khoản; chạy migration/seed trên chế độ mới. Nếu chuyển máy, sao lưu DB theo driver và `storage/uploads` khi ứng dụng đã dừng; không chỉ copy mã nguồn.

**Nâng bản local đang dùng:** dừng API trước, chạy `npm.cmd run db:migrate` (thêm 004, không sửa 001–003), `npm.cmd run db:check`, rồi khởi động lại API. Phiên phát triển task A chỉ migrate database thử, chưa thay DB đang chạy của bạn. Các đơn `demo_checkouts` vẫn giữ riêng và không tự được chuyển thành đơn có tiến độ/admin.

## Địa chỉ và kiểm tra

- Web: `http://127.0.0.1:5173` — luồng đặt thử; tracking tại `/track#token`.
- API: `http://127.0.0.1:4000/api/health`.
- Web gọi đường dẫn tương đối `/api/...`, Vite proxy đến cổng 4000.
- API nghiệp vụ chưa có sẽ trả 404; không có mock thành công để nhầm là đã lưu.

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run contract:check
npm.cmd run test:api
npm.cmd run test:smoke
npm.cmd run db:check
```

Kết quả starter: [kiểm tra starter](docs/qa/2026-10-27-starter-verification.md); kết quả refactor: [báo cáo E1](docs/qa/2026-10-29-clean-layout.md). Smoke không ghi file mặc định; thêm `-- --out <file>` khi muốn lưu bằng chứng. Script khảo sát không dùng exit code để báo các mismatch đã biết. Docker cần kiểm tra trên máy có Docker engine; không suy ra đã chạy từ việc có Compose.

## Cách đưa cho coding agent hoặc tự triển khai

Mở thư mục này làm project. Đọc `AGENTS.md`, rồi dùng nguyên prompt trong `tasks/A-api-data.md`. Chỉ giao task B/C/D sau khi đạt điều kiện phụ thuộc. Từng task có phạm vi file và tiêu chí Done. Không yêu cầu agent làm tất cả đồng thời trên cùng checkout.

Giữ giỏ hàng theo quyết định trong task E; hợp đồng/docs/task A/C đã đồng bộ thành 1–10 thiết kế cùng sản phẩm/mẫu, mỗi dòng 1–10 bản. Multipart dùng payload + photo_i/preview_i, tổng ≤16 MiB. Không thêm payment, nhiều mẫu, cloud hoặc microservices. Thời lượng trong kế hoạch là ước lượng, không phải phần đã hoàn thành hoặc cam kết thời gian.
