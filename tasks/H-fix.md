# H-fix — Hoàn thiện UI trước v1.1.0

Trạng thái: đã sửa và browser test local PASS ngày 11/11/2026. Chờ người dùng kiểm tra thủ công, review/commit, phát hành và nghiệm thu digest `v1.1.0`. Báo cáo: [H-fix](../docs/qa/2026-11-11-task-H-fix.md).

Phạm vi do người dùng giao sau review H:

- H-02: dropdown phải gọi luồng restore/edit thật, nạp đúng ảnh/crop/nội dung; “Thẻ mới” reset draft. Sửa thẻ 2 không làm thay đổi thẻ khác.
- H-03: chọn 3/4 thiết kế, chỉ gửi ba thiết kế; thẻ thứ tư và ảnh của nó còn sau reload. Bỏ chọn hết không được fallback gửi cả giỏ.
- H-04: home/design/cart không vượt viewport 375/768/1440 trên Chrome và Edge; sửa layout thực, không che overflow toàn trang.
- IconCard: import/export hợp lệ, không ReferenceError khi render trang thiết kế.
- Theo trả lời của người dùng: checkout demo trực tiếp, không thu tiền; không thực hiện R5 trong task này.
- Thu gọn ảnh QA, chỉ giữ 375 px/JPEG. Chuẩn bị changelog `v1.1.0`, `Có migration: không`.

Kiểm tra: typecheck, build, contract:check, format:check và các suite hiện có; mở image local build từ working tree, chạy `scripts/acceptance-browser.mjs` với regression cho các lỗi trên. Chưa phát hành thì chỉ ghi PASS cho candidate local.

Thứ tự tiếp theo theo người dùng: ảnh điện thoại thật/CSV Excel → review/commit → phát hành `v1.1.0` giữ `v1` → chạy browser acceptance trên đúng digest mới. Không tự commit/push/phát hành trong H-fix.
