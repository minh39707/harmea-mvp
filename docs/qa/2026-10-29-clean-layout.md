# Task E — Giai đoạn 1, 29/10/2026

Đã triển khai bước 1–3 trên nhánh `refactor/clean-layout`. Giai đoạn 2 chưa làm, chờ sau task D. Chưa nghiệm thu thao tác giao diện bằng trình duyệt.

## Đã thay đổi

- Chuyển verification starter, báo cáo và bằng chứng QA gốc vào `docs/qa/`; giữ nguyên nội dung phát hiện và ghi chú đường dẫn/số dòng lịch sử. Bằng chứng gốc giữ nguyên nội dung.
- Chuyển smoke test sang `tests/smoke.mjs`, thêm `npm.cmd run test:smoke`. Chỉ ghi file khi có `-- --out <path>`; kiểm tra cú pháp tham số trước khi mở database thử.
- Tách backend: middleware headers/Origin/rate limit, helper lỗi/validation/hash, module catalog, checkout router/service/repository/receipt và tracking. Xóa `commerce.ts`. Giữ nguyên `server.ts`, `db.ts`, migration, contract, route, status/message, thứ tự validation và transaction.
- Tách frontend thành shell trong `app/`, các feature editor/cart/checkout/tracking, types/API/format/UI chung. State chung vẫn giữ quan hệ `busy`, `receipt`, `error`; xử lý ảnh, editor, checkout và tracking chuyển sang module/hook riêng. Giữ key `harmea.cart.v2`, payload, fragment, scroll và thuộc tính truy cập.
- Chia CSS thành file cạnh feature và CSS chung/responsive. `styles/index.css` nhập tập trung theo thứ tự cũ để giữ cascade; đây là lựa chọn của Giai đoạn 1, chưa chuyển sang import độc lập trong từng component vì có thể đổi thứ tự CSS. Không thay màu, font, khoảng cách hoặc responsive.
- Sửa README phản ánh chức năng demo thực có và phần chưa làm (QA-08). QA-01 đến QA-07 chưa sửa ở E1; QA-06 thuộc B, QA-07 thuộc C.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| `npm.cmd run format` sau mỗi bước | Thành công |
| `npm.cmd run format:check` cuối giai đoạn | Qua |
| `npm.cmd run typecheck` sau mỗi bước | Qua |
| `npm.cmd run build` sau mỗi bước hoàn chỉnh | Qua |
| `npm.cmd run contract:check` cuối giai đoạn | Qua, 9 paths; không chứng minh endpoint đã có |
| Smoke sau bước 1, 2, 3 | Mỗi lần 30 phép / 22 khớp / 8 không khớp |
| So sánh smoke với QA gốc | Cùng tên, `actual`, `pass` của toàn bộ 30 phép |
| Giới hạn độ dài file | `app/App.tsx` dưới 150 dòng; mọi file trong web/API `src` không quá 250 dòng |
| HTML render trên server với state giả lập | 15 trường hợp của 5 màn hình khớp HTML trước refactor tại `d18d6aa` |
| Phân tích CSS trước/sau | Cùng selectors, declarations, media contexts và thứ tự cascade; CSS production vẫn có hash `CMKal9Ac` |

HTML được so bằng bundle Rolldown và React server rendering, với các trạng thái giá tải/lỗi, giỏ trống/có item, preview/chỉnh sửa, busy, success và tracking. State/hooks được cung cấp để so markup; kiểm tra này không thực thi tương tác hay effects. CSS được so bằng PostCSS đang có trong dependency tree; không thêm dependency. Đây là kiểm tra chuyển cấu trúc, không thay thế integration test nghiệp vụ hoặc kiểm tra trực quan.

Bằng chứng mới:

- `2026-10-29-e1-step1-evidence.json`
- `2026-10-29-e1-step2-evidence.json`
- `2026-10-29-e1-step3-evidence.json`
- `2026-10-29-e1-render-evidence.json`

Smoke dùng Express và PGlite thật, database riêng trong thư mục tạm, không đọc `.env` hoặc dữ liệu đơn hiện có. Nó vẫn là script khảo sát với exit code 0 dù có 8 mismatch đã biết; không gọi toàn bộ smoke là PASS. Thư mục database tạm được giữ trên máy như script gốc, không đưa vào repo.

## Chưa kiểm tra / còn lại

- Browser access host và Windows native pipe đều không khả dụng khi kiểm tra lại. Không có ảnh chụp trước/sau; chưa chạy tay luồng hai thiết kế → sửa → checkout → clipboard → tracking, reload giỏ, desktop/375px. Các mục này chưa PASS.
- Chưa kiểm tra PostgreSQL/Docker, phần cứng NFC, auth/state machine hoặc preview PNG vì chưa triển khai trong E1.
- Các khoảng trống A–D và 8 mismatch vẫn giữ nguyên theo yêu cầu của giai đoạn refactor. Không đổi contract hoặc thêm tính năng để làm xanh bộ kiểm tra.

## Bàn giao

Tiếp theo: đồng bộ quyết định giữ giỏ hàng vào hợp đồng/docs/01–03/task A/C, rồi triển khai A → B → C → D. Khi A/B sửa nghiệp vụ, cập nhật bộ kiểm tra theo hợp đồng mới; không cố giữ mốc 22/8. E Giai đoạn 2 dùng mốc kiểm tra sau D và chỉ redesign khi đến lượt.
