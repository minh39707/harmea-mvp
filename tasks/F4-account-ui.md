# F4 — Giao diện tài khoản user

**Trạng thái:** chưa làm. **Ước lượng:** 3–5 giờ. **Phụ thuộc:** F3.

## Mục tiêu

Khách có thể đăng ký, đăng nhập, xem "Đơn của tôi", sửa hồ sơ và đổi mật khẩu. Checkout tự điền địa chỉ mặc định khi đã đăng nhập. Admin đăng nhập qua cùng API auth.

## Phạm vi file

`apps/web/src/features/account/` (mới), `apps/web/src/app/` (Header, Storefront, App: điều hướng), `apps/web/src/features/checkout/` (prefill, thông báo gắn đơn vào tài khoản), `apps/web/src/features/admin/` (dùng `/api/auth/session`, kiểm tra role), `apps/web/src/shared/api.ts` và `types.ts`, `apps/api/src/app.ts` (thêm SPA fallback cho route mới), `tests/` cho các phần thuần logic.

## Kết quả phải có

- Route: `/login`, `/register`, `/account` (hồ sơ + đổi mật khẩu), `/account/orders`, `/account/orders/:id`. Nếu F7 chưa làm thì dùng cơ chế điều hướng hiện có theo `location.pathname`. **Không thêm react-router.**
- Hook `useAuth()` gọi `GET /api/auth/session` khi tải trang, giữ user trong memory/React state. **Không lưu gì về session vào localStorage hay sessionStorage.**
- Header: chưa đăng nhập thì hiện "Đăng nhập". Đã đăng nhập thì hiện tên, menu "Đơn của tôi" và "Đăng xuất". Admin thấy thêm link "Quản trị".
- Form đăng ký/đăng nhập: validate phía client (email, mật khẩu 8–128, xác nhận mật khẩu), hiển thị lỗi từ server (409 email trùng, 401, 429 có thời gian chờ). Có `autocomplete` đúng chuẩn (`email`, `new-password`, `current-password`).
- Sau khi đăng nhập thì quay lại trang trước đó qua `?next=`. Chỉ chấp nhận path nội bộ bắt đầu bằng `/` và không bắt đầu bằng `//` (chống open redirect).
- "Đơn của tôi": danh sách gồm mã đơn, ngày, số thiết kế, tổng tiền, trạng thái (dùng `shared/order-status.ts`). Chi tiết đơn có lịch sử trạng thái, người nhận, danh sách thiết kế, ảnh preview (nếu F3 có endpoint ảnh cho chủ đơn).
- Checkout: đã đăng nhập thì điền sẵn người nhận từ `defaultAddress`, có checkbox "Lưu làm địa chỉ mặc định" (gọi `PATCH /api/me` sau khi đặt đơn thành công). Chưa đăng nhập thì hiện gợi ý "Đăng nhập để theo dõi đơn dễ hơn", nhưng **không bắt buộc**.
- Trang success: nếu đã đăng nhập thì thêm link tới đơn trong tài khoản, link tracking vẫn giữ.
- Admin: `/admin/login` dùng `POST /api/auth/session`. Nếu tài khoản không phải admin thì báo "Tài khoản không có quyền quản trị" và không hiện dữ liệu. 401/403 ở bất kỳ request admin nào đều đưa về trang login.
- Đăng xuất xóa state ngay trên UI. Lỗi mạng khi logout thì báo rõ, không giả vờ đã đăng xuất.
- Responsive tại 375/768/1440px, dùng tokens trong `styles/tokens.css`. CSS đặt cạnh component.

## Hoàn thành khi

1. Typecheck và build qua. Test hiện có qua. Thêm unit test cho hàm kiểm tra `next` an toàn và hàm validate form.
2. Kiểm tra thủ công (hoặc Playwright nếu môi trường có) các luồng: đăng ký → đặt đơn → thấy trong "Đơn của tôi" → admin đổi trạng thái → user thấy trạng thái mới. Ghi rõ đã kiểm tra bằng cách nào. Không có trình duyệt thì ghi "chưa kiểm tra trực quan".
3. Grep `localStorage|sessionStorage` không có dòng mới nào liên quan auth.
4. Có báo cáo `docs/qa/<ngày>-task-F4.md`.

## Prompt giao việc

```text
Thực hiện task F4 trong tasks/F4-account-ui.md. Đọc tasks/00-ROADMAP-v2.md, AGENTS.md, docs/03, contracts/openapi.json (phần auth/me), báo cáo F3 trong docs/qa và mã trong apps/web/src (app/, features/checkout, features/admin, shared/).

Xây UI tài khoản: login, register, account, đơn của tôi, prefill checkout, header theo trạng thái đăng nhập, admin login dùng auth chung và kiểm tra role. Không thêm thư viện router hay state. Không lưu session vào web storage. Chống open redirect cho ?next=. Giữ đặt hàng không cần tài khoản. Dùng tokens CSS hiện có, responsive 375/768/1440.

Chạy typecheck, build và mọi test, thêm unit test cho logic mới. Kiểm tra luồng end-to-end nếu có trình duyệt, nếu không có thì ghi rõ. Viết báo cáo docs/qa/<ngày>-task-F4.md, commit trên nhánh feat/F4-account-ui. Không push.
```
