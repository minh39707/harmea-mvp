# Harméa MVP — bắt đầu tại đây

Bản demo local và tài liệu triển khai cho **một người**; mốc demo ban đầu 28/10/2026. Đã có luồng đặt thử, chưa có xử lý đơn qua admin hoặc thanh toán.

## Đã có / cần làm tiếp

| Đã triển khai / chuẩn bị | Cần làm tiếp |
|---|---|
| UI sản phẩm, cá nhân hóa, giỏ hàng, checkout, success và tracking | Kiểm tra thao tác trình duyệt, desktop và mobile |
| API health, sản phẩm, `/api/demo-checkouts`, `/api/demo-tracking` | Đồng bộ hợp đồng OpenAPI và phạm vi giữ giỏ hàng trước task A |
| Validation backend, decode/nén ảnh, giá server, snapshot và lưu bền PGlite | Ảnh gốc, preview PNG, crop và vùng an toàn của mẫu |
| Migration checksum, adapter PGlite/PostgreSQL, Docker Compose | Auth admin, ảnh riêng tư, danh sách/chi tiết và lịch sử/trạng thái |
| E Giai đoạn 1: tách backend/frontend/CSS; smoke test database riêng | A → B → C → D, rồi E Giai đoạn 2 (redesign) |

Giá seed **50.000 VND là số giả cho demo**. Không có thanh toán hoặc tự động sản xuất/giao hàng. Smoke hiện có **30 phép: 22 khớp, 8 không khớp** do các khoảng trống đã ghi trong [báo cáo QA](docs/qa/2026-10-29-qa-report.md). Chưa nghiệm thu toàn MVP hoặc PostgreSQL thực tế.

## Cấu trúc hiện tại

```text
apps/web/src/app/        shell, điều hướng và state chung
apps/web/src/features/   editor, cart, checkout, tracking
apps/web/src/shared/     types, API client, format và UI dùng chung
apps/web/src/styles/     CSS chung, tokens và responsive
apps/api/src/middleware/ headers, Origin và rate limit
apps/api/src/lib/        validation, lỗi và hash
apps/api/src/modules/    catalog, checkout (router/service/repository), tracking
tests/                  smoke API với database thử riêng
docs/qa/                báo cáo và bằng chứng kiểm tra
```

CSS của từng feature nằm cạnh component; `styles/index.css` nhập tập trung theo thứ tự cũ để giữ nguyên cascade trong Giai đoạn 1. Các module admin/orders theo hợp đồng còn cần triển khai.

## Đọc theo thứ tự

1. [Requirement và phạm vi](docs/01-requirements.md).
2. [Kiến trúc và quyết định kỹ thuật](docs/02-architecture.md).
3. [Dữ liệu, API và quy tắc tích hợp](docs/03-data-api.md); hợp đồng máy đọc được: [OpenAPI](contracts/openapi.json).
4. [Kế hoạch 8–10 giờ dự kiến cho một người](docs/05-solo-plan.md).
5. [Task E](tasks/E-clean-layout.md): Giai đoạn 1 đã tách code; tiếp theo A → B → C → D → E Giai đoạn 2. Xem [báo cáo E1](docs/qa/2026-10-29-clean-layout.md) và giới hạn kiểm tra giao diện.
6. Dùng [checklist demo](docs/04-acceptance-demo.md) để nghiệm thu.

## Chạy trên Windows / PowerShell

Yêu cầu: Node.js 24.x và npm. Chạy mọi lệnh từ thư mục chứa README này. Dùng `npm.cmd` nếu PowerShell chặn `npm.ps1`.

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run setup
```

`setup` tạo `.env` và `.local-admin.txt` với bí mật ngẫu nhiên, giữ nguyên nếu `.env` đã có. Tài khoản này dùng khi task A triển khai đăng nhập, hiện chưa có API đăng nhập. Không đưa hai file này vào Git/chia sẻ. `.env.example` là mẫu công khai.

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

## Địa chỉ và kiểm tra

- Web: `http://127.0.0.1:5173` — luồng đặt thử; tracking tại `/track#token`.
- API: `http://127.0.0.1:4000/api/health`.
- Web gọi đường dẫn tương đối `/api/...`, Vite proxy đến cổng 4000.
- API nghiệp vụ chưa có sẽ trả 404; không có mock thành công để nhầm là đã lưu.

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run contract:check
npm.cmd run test:smoke
npm.cmd run db:check
```

Kết quả starter: [kiểm tra starter](docs/qa/2026-10-27-starter-verification.md); kết quả refactor: [báo cáo E1](docs/qa/2026-10-29-clean-layout.md). Smoke không ghi file mặc định; thêm `-- --out <file>` khi muốn lưu bằng chứng. Script khảo sát không dùng exit code để báo các mismatch đã biết. Docker cần kiểm tra trên máy có Docker engine; không suy ra đã chạy từ việc có Compose.

## Cách đưa cho coding agent hoặc tự triển khai

Mở thư mục này làm project. Đọc `AGENTS.md`, rồi dùng nguyên prompt trong `tasks/A-api-data.md`. Chỉ giao task B/C/D sau khi đạt điều kiện phụ thuộc. Từng task có phạm vi file và tiêu chí Done. Không yêu cầu agent làm tất cả đồng thời trên cùng checkout.

Giữ giỏ hàng theo quyết định trong task E; các tài liệu/hợp đồng cũ về một thiết kế mỗi đơn cần đồng bộ trước task A. Không thêm payment, nhiều mẫu, cloud hoặc microservices. Thời lượng trong kế hoạch là ước lượng, không phải phần đã hoàn thành hoặc cam kết thời gian.
