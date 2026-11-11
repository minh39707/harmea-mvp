# F1 — Gỡ API legacy `/api/demo-*`

**Trạng thái:** đã hoàn thành và kiểm tra ngày 11/11/2026 trên nhánh `feat/F1-remove-legacy`; xem [báo cáo F1](../../docs/qa/2026-11-11-task-F1.md). **Ước lượng ban đầu:** 1 giờ. **Phụ thuộc:** F0.

## Lý do

Frontend đã dùng `/api/orders` và `/api/tracking/lookup` (task C). Module `checkout/` và `tracking/` legacy cùng bảng `demo_checkouts` chỉ còn để tương thích. Gỡ chúng trước F2 để giảm lượng SQL phải chuyển sang MySQL.

## Phạm vi file

- Xóa `apps/api/src/modules/checkout/` và `apps/api/src/modules/tracking/` (module legacy, **không phải** `orders/tracking.ts`).
- Sửa `apps/api/src/modules/index.ts`. Kiểm tra tham số `secret` và `storage/checkout-secret` trong `server.ts`/`app.ts`: nếu chỉ module legacy dùng thì gỡ luôn.
- Frontend: grep `demo-` trong `apps/web/src` và gỡ code chết.
- `tests/smoke.mjs` và script `test:smoke`: bỏ hoặc viết lại thành smoke cho API canonical (health, product, tạo đơn tối thiểu, tracking lookup).
- Contract: xóa các path `/api/demo-*`. Cập nhật docs/03 và README.
- **Không sửa** các file migration 001–004 (F2 sẽ viết schema MySQL mới, không có bảng `demo_checkouts`).

## Hoàn thành khi

1. `grep -rn "demo-check\|demo_checkouts\|/api/demo" apps tests scripts contracts` chỉ còn kết quả trong `database/` (lịch sử Postgres).
2. Gọi `GET /api/demo-checkouts` (hoặc path legacy tương ứng) trả 404 theo format lỗi chung.
3. Typecheck, build, contract:check, `test:api`, `test:editor`, `test:checkout`, `test:admin` qua. Smoke mới qua.
4. Có báo cáo `docs/qa/<ngày>-task-F1.md`.

## Prompt giao việc

```text
Thực hiện task F1 trong tasks/done/F1-remove-legacy.md. Đọc tasks/00-ROADMAP.md, AGENTS.md (bản v2 sau F0), README.md và docs/03-data-api.md.

Gỡ hoàn toàn API legacy /api/demo-* (module checkout/ và tracking/ legacy, secret liên quan nếu không còn ai dùng, code frontend chết, smoke legacy). Giữ nguyên /api/orders, /api/tracking/lookup và orders/tracking.ts. Không sửa migration SQL cũ. Viết lại smoke test cho API canonical. Cập nhật contract, docs/03 và README.

Chạy typecheck, build, contract:check và mọi test suite. Viết báo cáo docs/qa/<ngày>-task-F1.md, commit trên nhánh feat/F1-remove-legacy. Không push.
```
