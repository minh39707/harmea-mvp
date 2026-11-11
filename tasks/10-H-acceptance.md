# H — Nghiệm thu toàn bộ

**Trạng thái:** `v1` đã nghiệm thu và có findings. [H-fix](H-fix.md) đã sửa CSP/H-02/H-03/H-04, browser candidate local PASS. **Chờ ảnh điện thoại thật/Excel, review/commit, phát hành và nghiệm thu digest `v1.1.0` trước bàn giao.** Xem [H gốc](../docs/qa/2026-11-11-acceptance.md) và [H-fix](../docs/qa/2026-11-11-task-H-fix.md). **Phụ thuộc:** R1–R4, G1–G3 (R5 và G1b nếu đã làm).

## Mục tiêu

Kiểm tra toàn bộ website trên stack Docker chạy ở máy local, bằng đúng image sẽ bàn giao. Kiểm tra trên server do người vận hành làm theo checklist trong `DEPLOY.md`. Sửa lỗi nhỏ tìm thấy (kèm test); lỗi lớn thì ghi thành đề xuất task mới.

**Tiêu chí nghiệm thu của người vận hành (bắt buộc PASS, chạy trên máy có Docker hoặc trong CI G2):**

```bash
docker build --platform linux/amd64 -t harmea-web:test .
docker run --rm -p 3000:3000 --env-file .env harmea-web:test   # curl http://localhost:3000/health → 200
docker network create web && docker compose up --build          # stack đầy đủ
```

## Checklist (ghi PASS/FAIL kèm bằng chứng, không tick trước)

**Khách**
- [ ] Landing → thiết kế thẻ (tên tiếng Việt, crop, 3 màu) → lưu vào giỏ → chỉnh tiếp → lưu thẻ thứ hai → thẻ đầu không đổi.
- [ ] Chọn ảnh điện thoại có xoay EXIF: hiển thị đúng chiều; dung lượng sau nén nhỏ; crop nhỏ thì hiện cảnh báo chất lượng in.
- [ ] Tạo 4 thẻ (2 thẻ chung ảnh khác crop) → reload → đủ 4 thẻ đúng crop. Sửa thẻ 2 → thẻ khác không đổi. Mở 2 tab → danh sách giỏ đồng bộ.
- [ ] Checkout → trang success hiện mã đơn, nút sao chép mã hoạt động. Đặt 3/4 thẻ → thẻ còn lại vẫn trong giỏ.
- [ ] `/track`: nhập mã đơn + SĐT (thử dạng có khoảng trắng và `+84`) → thấy tiến độ. Sai SĐT → thông báo chung. Thử sai 6 lần → bị khóa tạm thời.
- [ ] Trang nội dung, FAQ, chính sách, 404, back/forward.

**Admin** (đặt `ADMIN_ENABLED=true` ở local)
- [ ] Danh sách, lọc, phân trang, tìm theo mã đơn; xem chi tiết, ảnh gốc và PNG; đổi trạng thái; hủy có lý do; xung đột version khi mở hai tab.
- [ ] Đổi giá → đơn cũ giữ giá cũ. Tắt sản phẩm → không đặt được đơn. Thống kê khớp dữ liệu. CSV mở trong Excel đúng tiếng Việt.
- [ ] Bỏ `ADMIN_ENABLED` với `NODE_ENV=production` → `/admin` và `/api/admin/*` trả 404.

**Bảo mật và riêng tư**
- [ ] Response tra cứu không chứa tên, SĐT, địa chỉ, ảnh hay URL nhạc.
- [ ] Không response nào có `Set-Cookie`. `storage/uploads` không truy cập trực tiếp được qua URL.
- [ ] Log container không chứa SĐT, địa chỉ, URL nhạc hay body đơn (grep log sau khi chạy kịch bản).
- [ ] Header bảo mật đúng (CSP, X-Content-Type-Options, Referrer-Policy). Request ghi từ Origin lạ → 403.
- [ ] `db` không có port mở ra ngoài; image chạy bằng user `node`; image không chứa file `.env`.

**Vận hành**
- [ ] `docker compose down` rồi `up` (không `-v`) vẫn giữ dữ liệu. Backup → xóa dữ liệu → restore thành công.
- [ ] `docker compose stop app` thoát êm với exit code 0.
- [ ] Responsive tại 375/768/1440 px trên Chrome và một trình duyệt khác. Ghi điểm Lighthouse của landing (Performance, Accessibility, SEO); không đặt ngưỡng giả.
- [ ] 20 lượt đặt đơn liên tiếp không lỗi, không rò kết nối DB. Ghi RAM/CPU đo bằng `docker stats` vào DEPLOY.md.

## Kết quả phải có

`docs/qa/<ngày>-acceptance.md` gồm bảng checklist, bằng chứng (ảnh chụp trong `docs/qa/assets/`, không chứa dữ liệu thật), danh sách lỗi đã sửa và lỗi còn lại, tag hoặc digest của image đã nghiệm thu. Cập nhật README và DEPLOY.md.

## Prompt giao việc

```text
Thực hiện task H trong tasks/10-H-acceptance.md. Đọc tasks/00-ROADMAP.md, AGENTS.md, README.md, DEPLOY.md, docs/01–04 và mọi báo cáo docs/qa của R1–G3.

Chạy tiêu chí nghiệm thu của người vận hành (docker build linux/amd64, docker run --env-file .env và /health trả 200, docker compose up --build với network web). Dựng stack bằng docker-compose.yml trên máy (thêm override ports chỉ ở local, ADMIN_ENABLED=true chỉ ở local), chạy toàn bộ checklist và ghi PASS/FAIL kèm bằng chứng thực. Chỉ sửa lỗi nhỏ, rõ ràng (kèm test); lỗi lớn thì ghi thành đề xuất. Không tick mục chưa chạy; mục cần server thật hoặc trình duyệt mà môi trường không có thì để "chưa kiểm tra" kèm hướng dẫn cho người dùng.

Viết docs/qa/<ngày>-acceptance.md, ghi tag hoặc digest của image, cập nhật README và DEPLOY.md. Không commit, không tạo nhánh, không push: để thay đổi trong working tree cho Claude kiểm tra.
```
