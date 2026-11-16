# F2 — Chuyển cơ sở dữ liệu sang MySQL 8.4

**Trạng thái:** đã triển khai và kiểm tra MySQL 8.4 native; còn nghiệm thu Docker và thao tác UI trực tiếp. Xem [báo cáo F2](../../docs/qa/2026-11-11-task-F2.md). **Ước lượng:** 4–6 giờ. **Phụ thuộc:** F1.

## Mục tiêu

Ứng dụng, script và toàn bộ test chạy trên MySQL 8.4 qua `mysql2/promise`. Gỡ `pg`, `@types/pg` và `@electric-sql/pglite`. Hành vi API giữ nguyên, test hiện có phải qua mà **không được nới lỏng assertion**.

## Phạm vi file

`apps/api/src/db.ts`, `apps/api/package.json`, các repository/router có SQL trong `apps/api/src/modules/**`, `scripts/migrate.ts`, `scripts/check-db.ts`, `scripts/setup.mjs`, `scripts/seed-demo.mjs`, `database/`, `compose.yaml`, `.env.example`, `tests/*.mjs`, README, docs/02, docs/03.

## Thiết kế bắt buộc

### Schema
- Chuyển các file Postgres hiện tại vào `database/postgres-legacy/` (chỉ lưu lịch sử, script không đọc). Tạo bộ mới `database/001_init.sql` là **schema cuối cùng** sau 001–004, viết bằng MySQL và không có `demo_checkouts`. Đọc kỹ 001–004 để không bỏ sót cột, ràng buộc hay index (đặc biệt `order_items` của 004 và các cột thiết kế đơn lẻ trong `orders` của 001: nếu cột nào không còn code dùng thì bỏ, và ghi lại trong báo cáo).
- Bảng: `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci` (để lưu đúng tiếng Việt).
- Bảng ánh xạ kiểu:

| Postgres | MySQL |
|---|---|
| `uuid` | `CHAR(36) CHARACTER SET ascii` |
| `jsonb` + `jsonb_typeof(x)='object'` | `JSON` + `CHECK (JSON_TYPE(x)='OBJECT')` |
| `timestamptz` | `DATETIME(3)`, luôn lưu UTC |
| `CHECK (x ~ '^[0-9a-f]{64}$')` | `CHECK (REGEXP_LIKE(x, '^[0-9a-f]{64}$', 'c'))` |
| `CHECK (status IN (...))` | giữ `CHECK` hoặc dùng `ENUM`, nhưng thống nhất cả schema |
| `text PRIMARY KEY` | `VARCHAR(255)` |

- Seed sản phẩm (cũ là 002) thành `database/002_seed_product.sql`, dùng `INSERT IGNORE`.

### Adapter `db.ts`
- Giữ interface `SqlConnection`/`Database` (`query`, `exec`, `transaction`, `close`) để code nghiệp vụ ít đổi. `query` trả `{ rows }`.
- `mysql2.createPool` với `uri: DATABASE_URL`, `timezone: 'Z'`, `charset: 'utf8mb4'`, `connectionLimit` lấy từ env (mặc định 10). Mỗi connection mới chạy `SET time_zone='+00:00'`.
- Chỉ bật `multipleStatements` trên **connection riêng của migration**, không bật trên pool của app (giảm rủi ro SQL injection).
- `transaction`: lấy connection, `beginTransaction`/`commit`/`rollback`, luôn `release`.
- Ngày giờ trả về API phải là ISO 8601 có `Z`, giống output hiện tại. Viết một hàm chuyển đổi chung, không xử lý rải rác.
- Cột JSON: `mysql2` tự parse. Khi ghi phải `JSON.stringify`.

### Viết lại SQL trong code
- Đổi placeholder `$1` thành `?`. Chú ý chỗ một tham số dùng hai lần (ví dụ `($1::text IS NULL OR status=$1)`) phải truyền giá trị hai lần.
- Bỏ `RETURNING`: INSERT xong thì SELECT lại theo id (id do app sinh bằng `randomUUID`). UPDATE dùng `affectedRows` để kiểm tra optimistic lock theo version.
- `ON CONFLICT DO NOTHING` cho `request_key`: dùng INSERT thường và bắt lỗi `ER_DUP_ENTRY` (errno 1062) để trả 409 như hiện tại.
- `count(*)::int` → `CAST(COUNT(*) AS UNSIGNED)` rồi `Number()`. `LIMIT ? OFFSET ?` truyền số nguyên (dùng `query` thay cho `execute` nếu gặp lỗi kiểu tham số của `mysql2`).

### Migration runner
- Giữ bảng `schema_migrations(name, sha256, applied_at)` và cơ chế checksum.
- **DDL trong MySQL không chạy trong transaction được.** Runner chạy từng file; chỉ ghi `schema_migrations` sau khi file chạy thành công. Nếu file lỗi giữa chừng thì báo rõ rằng phải sửa DB thủ công. Ghi quy ước vào README: mỗi file migration nên chỉ có một thay đổi logic.
- Dùng `GET_LOCK('harmea_migrate', 30)` để tránh hai tiến trình migrate cùng lúc.

### Môi trường
- `compose.yaml`: thay bằng service `db` dùng `mysql:8.4`, port `127.0.0.1:3306:3306`, volume `harmea_mysql`, healthcheck `mysqladmin ping`, biến `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` sinh bởi `setup`.
- `.env.example`: bỏ `DB_DRIVER`, `DATA_DIR`, `POSTGRES_*`. Thêm `DATABASE_URL=mysql://harmea:...@127.0.0.1:3306/harmea`, `MYSQL_*`, `TEST_DATABASE_URL` (user có quyền CREATE/DROP DATABASE, dùng cho test).
- `scripts/setup.mjs` sinh mật khẩu MySQL ngẫu nhiên và giữ nguyên `.env` nếu đã có.

### Test
- Viết helper `tests/helpers/db.mjs`: mỗi file test tạo database `harmea_test_<random>` từ `TEST_DATABASE_URL`, chạy migration, rồi DROP khi kết thúc (kể cả khi test fail).
- Nếu thiếu `TEST_DATABASE_URL` thì test **fail với thông báo rõ ràng**, không tự skip.
- Thêm test: chuỗi tiếng Việt có dấu và emoji trong tên/ghi chú được lưu và đọc lại đúng; gửi trùng `requestKey` cùng lúc (2 request song song) chỉ tạo 1 đơn; đổi trạng thái với version cũ trả 409.

## Hoàn thành khi

1. `docker compose up -d --wait db`, `npm run db:migrate` (chạy hai lần, lần hai báo "Already applied"), `npm run db:check` đều chạy được trên MySQL.
2. `npm run dev`: tạo đơn qua UI, admin xem được, tracking hiển thị đúng. Ghi lại cách đã kiểm tra.
3. Mọi test suite qua trên MySQL. `package-lock.json` không còn `pg` hay `pglite`.
4. Restart API vẫn đọc được đơn cũ.
5. README phần "Chạy trên Windows" viết lại cho MySQL (bỏ cách B PGlite). Có báo cáo `docs/qa/<ngày>-task-F2.md`.

## Prompt giao việc

```text
Thực hiện task F2 trong tasks/done/F2-mysql.md. Đọc tasks/00-ROADMAP.md, AGENTS.md, README.md, docs/02, docs/03, contracts/openapi.json, toàn bộ database/*.sql, apps/api/src/db.ts, scripts/migrate.ts, scripts/check-db.ts, scripts/setup.mjs và các test.

Chuyển ứng dụng từ PostgreSQL/PGlite sang MySQL 8.4 bằng mysql2 theo đúng phần "Thiết kế bắt buộc" của task. Giữ interface adapter và hành vi API. Viết schema MySQL mới tương đương 001–004 (không có demo_checkouts) và chuyển file cũ vào database/postgres-legacy/. Không thêm ORM. Không nới lỏng assertion của test hiện có. Test chạy trên MySQL thật với database tạm cho mỗi file test.

Chạy docker compose db, migrate hai lần, db:check, typecheck, build, contract:check và toàn bộ test. Cập nhật README và docs. Viết báo cáo docs/qa/<ngày>-task-F2.md. Không commit, không tạo nhánh, không push: để thay đổi trong working tree cho Claude kiểm tra.
```
