# Feature folders

`home/`, `editor/`, `cart/` — storefront, tùy chỉnh, giữ và sửa giỏ.
`checkout/`, `tracking/` — đặt đơn không tài khoản, tra cứu bằng mã đơn + SĐT.
`admin/` — danh sách/chi tiết đơn, ảnh riêng, cập nhật trạng thái, quản lý sản phẩm, thống kê và CSV sau gate.

Một shell/layout chung ở `src/`; dùng `/api` qua Vite proxy.
Không có trang account/login hoặc session admin; mã đơn và SĐT chỉ gửi trong POST body để tra cứu.
