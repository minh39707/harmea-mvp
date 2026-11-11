# H — Nghiệm thu toàn bộ v2

**Trạng thái:** chưa làm. **Ước lượng:** 3–5 giờ. **Phụ thuộc:** F0–F7, G1–G3 (F8 và G1b nếu đã làm).

## Mục tiêu

Kiểm tra toàn bộ website trên stack Docker production chạy trên máy local, đúng image sẽ bàn giao. Việc kiểm tra trên server AWS do người vận hành làm theo checklist trong `docs/06-docker-handoff.md`. Sửa lỗi nhỏ tìm thấy. Lỗi lớn thì ghi lại thành task mới, không sửa lan man.

## Checklist (ghi PASS/FAIL kèm bằng chứng, không tick trước)

**Chức năng khách và user**
- [ ] Landing → thiết kế thẻ (ảnh tiếng Việt, crop, 3 màu) → thêm 2 thiết kế vào giỏ → checkout không cần tài khoản → nhận link tracking → tracking hiển thị đúng.
- [ ] Đăng ký → đặt đơn → đơn có trong "Đơn của tôi" → đăng xuất → đăng nhập lại vẫn thấy đơn.
- [ ] Quên mật khẩu (driver log hoặc SMTP thật) → đặt lại → session cũ bị hủy.
- [ ] Email xác nhận đơn và email đổi trạng thái được tạo hoặc gửi.
- [ ] Các trang nội dung, 404, back/forward, chia sẻ link (OG).

**Admin**
- [ ] Đăng nhập admin, lọc và phân trang đơn, xem ảnh gốc/PNG, đổi trạng thái, hủy đơn có lý do, xung đột version khi mở hai tab.
- [ ] Đổi giá → đơn cũ giữ giá cũ. Tắt sản phẩm → không đặt được đơn.
- [ ] Khóa user → user bị đăng xuất. Không thể làm hệ thống còn 0 admin.
- [ ] Thống kê đúng với dữ liệu thật. CSV mở được trong Excel với tiếng Việt đúng.

**Bảo mật**
- [ ] User thường gọi trực tiếp mọi `/api/admin/*` → 403. Chưa đăng nhập → 401.
- [ ] User A không xem được đơn hay ảnh của user B.
- [ ] Cookie có `HttpOnly`, `Secure`, `SameSite=Lax` trên HTTPS. Không có token hay session trong localStorage/sessionStorage (kiểm tra bằng DevTools).
- [ ] `storage/uploads` không truy cập trực tiếp được qua URL.
- [ ] Log container không chứa mật khẩu, token, URL nhạc hay body đơn (grep log sau khi chạy kịch bản).
- [ ] Header bảo mật (CSP, HSTS, X-Content-Type-Options, Referrer-Policy) đúng. Port 3306 đóng từ bên ngoài.
- [ ] Rate limit đăng nhập và forgot hoạt động.

**Vận hành**
- [ ] `down` rồi `up` giữ dữ liệu. Backup và restore diễn tập thành công.
- [ ] Responsive tại 375/768/1440 px trên Chrome và một trình duyệt khác. Lighthouse cho landing (ghi điểm Performance, Accessibility, SEO; không đặt ngưỡng giả).
- [ ] Tải thử nhẹ: 20 lượt đặt đơn liên tiếp không lỗi và không rò kết nối DB (theo dõi `SHOW PROCESSLIST`).

## Kết quả phải có

`docs/qa/<ngày>-acceptance-v2.md` gồm bảng checklist, bằng chứng (ảnh chụp lưu trong `docs/qa/assets/`, không chứa token hay dữ liệu thật), danh sách lỗi đã sửa và lỗi còn lại. README cập nhật bảng trạng thái. `docs/04-acceptance-demo.md` link tới báo cáo.

## Prompt giao việc

```text
Thực hiện task H trong tasks/H-acceptance-v2.md. Đọc tasks/00-ROADMAP-v2.md, AGENTS.md, README.md, docs/01–06 và mọi báo cáo docs/qa của F0–G3.

Dựng stack bằng compose.prod.yaml trên máy, chạy toàn bộ checklist, ghi PASS/FAIL kèm bằng chứng thực. Chỉ sửa lỗi nhỏ, rõ ràng (kèm test). Lỗi lớn thì ghi lại thành đề xuất task mới. Không tick mục nào chưa chạy. Mục cần server thật hoặc trình duyệt mà môi trường không có thì để "chưa kiểm tra" kèm hướng dẫn cho người dùng tự làm. Ghi tag hoặc digest của image đã nghiệm thu để bàn giao đúng bản.

Viết docs/qa/<ngày>-acceptance-v2.md, cập nhật README, commit trên nhánh feat/H-acceptance-v2. Không push.
```
