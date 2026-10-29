# Harméa MVP — bắt đầu tại đây

Bộ khởi tạo và tài liệu triển khai cho **một người, demo ngày 28/10/2026**. Đây chưa phải website bán hàng hoàn chỉnh. Yêu cầu hiện tại là chuẩn bị requirement, kiến trúc và khung để bắt tay làm.

## Đã có / cần làm tiếp

| Đã chuẩn bị | Chưa triển khai |
|---|---|
| React + TypeScript/Vite; Express + TypeScript; npm workspaces | Giao diện sản phẩm, cá nhân hóa, checkout và tracking |
| API `/api/health`, cấu hình build/typecheck | API tạo đơn, tracking, admin và xử lý ảnh |
| SQL schema/seed, migration có checksum; adapter database | Đăng nhập admin, cookie session và phân quyền |
| Docker Compose PostgreSQL; PGlite local dự phòng | Quy trình cập nhật trạng thái, lưu/tải ảnh |
| OpenAPI, requirement, kiến trúc, 4 phiếu công việc, checklist demo | Kiểm thử nghiệm thu toàn bộ website |

**Trang web hiện để trống có chủ đích.** Health 200 chỉ chứng minh API khởi động, không chứng minh nghiệp vụ đã hoạt động. Giá seed **50.000 VND là số giả cho demo**. Không có thanh toán.

## Đọc theo thứ tự

1. [Requirement và phạm vi](docs/01-requirements.md).
2. [Kiến trúc và quyết định kỹ thuật](docs/02-architecture.md).
3. [Dữ liệu, API và quy tắc tích hợp](docs/03-data-api.md); hợp đồng máy đọc được: [OpenAPI](contracts/openapi.json).
4. [Kế hoạch 8–10 giờ dự kiến cho một người](docs/05-solo-plan.md).
5. Bắt đầu [Task A — API/dữ liệu](tasks/A-api-data.md), sau đó B, C, D.
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

- Web: `http://localhost:5173` — trống cho tới task B/C/D.
- API: `http://127.0.0.1:4000/api/health`.
- Web gọi đường dẫn tương đối `/api/...`, Vite proxy đến cổng 4000.
- API nghiệp vụ chưa có sẽ trả 404; không có mock thành công để nhầm là đã lưu.

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run contract:check
npm.cmd run db:check
```

Kết quả đã kiểm tra trong lần bàn giao: xem [ki?m tra starter](docs/qa/2026-10-27-starter-verification.md). Docker cần kiểm tra trên máy có Docker engine; không suy ra đã chạy từ việc có Compose.

## Cách đưa cho coding agent hoặc tự triển khai

Mở thư mục này làm project. Đọc `AGENTS.md`, rồi dùng nguyên prompt trong `tasks/A-api-data.md`. Chỉ giao task B/C/D sau khi đạt điều kiện phụ thuộc. Từng task có phạm vi file và tiêu chí Done. Không yêu cầu agent làm tất cả đồng thời trên cùng checkout.

Không thêm payment, cart, nhiều mẫu, cloud hoặc microservices trước khi luồng demo chạy. Thời lượng trong kế hoạch là ước lượng, không phải phần đã hoàn thành hoặc cam kết thời gian.
