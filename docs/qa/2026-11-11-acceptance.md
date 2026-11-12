# H — Nghiệm thu cuối Harméa

> Cập nhật tiếp theo: [H-fix](2026-11-11-task-H-fix.md) đã sửa các findings và kiểm tra candidate local PASS. Báo cáo bên dưới giữ nguyên kết quả của `v1`, không thay thế bằng kết quả image chưa phát hành. Stack 3187 hiện dùng candidate H-fix để kiểm tra thủ công.

Ngày: 11/11/2026 · Nhánh: `feat/F2-mysql` · Commit nền: `7fde77f`.

**Kết luận: chưa đạt để bàn giao.** Đã thực hiện kiểm tra Docker, MySQL/MinIO, API và Chrome/Edge headless. Có bốn điểm trong `v1` cần xử lý: thiếu CSP, dropdown editor không khôi phục thiết kế, chưa chọn đặt một phần giỏ và overflow ở 375 px. CSP đã sửa và kiểm tra ở working tree/image local; ba điểm UI giữ nguyên vì người dùng đang chỉnh editor/giao diện. Không ghi bản sửa chưa phát hành là đã có trong `v1`.

## Bản được kiểm tra và môi trường

- Image Docker Hub: `hainam164/harmea-web:v1`, platform `linux/amd64`, commit `7fde77fcf92cac53d4a6d633e359f1d6b2a37383`.
- Digest: `sha256:eb683458f154e5209bf2a6a7100de8bbd7481fe5391079f24549a0b49c5fd035`.
- [Release GitHub Actions](https://github.com/minh39707/harmea-mvp/actions/runs/43024206582): preflight, verify/test, verify/docker, publish đều success. Image được smoke trước khi push; version/SHA/latest cùng digest. Kết quả CI đã xác nhận bằng GitHub CLI và Docker registry inspect.
- Local: Windows + Docker Desktop WSL2, 32 CPU, RAM Engine 15,51 GiB. MySQL `8.4.13`, buffer pool 128M cho stack thử; Node host `24.15.0`, Node trong image `24.22.2`.
- Source `git archive v1` ở thư mục tạm ngoài repo; không tạo checkout/branch mới. Compose project `harmea-h-20261111`, network riêng, DB/volume mới. Env thử ngẫu nhiên nằm ngoài repo; không đọc/sửa env dev hoặc DB của người dùng.
- App local chỉ publish `127.0.0.1:3187`; DB không publish port, chỉ nối backend internal. Admin bật **chỉ cho stack local này**. Stack được giữ chạy cho kiểm tra thủ công; không phải server production và env này không dùng để bàn giao.
- Browser: Chrome `157.0.8103.40`, Edge `157.0.4341.46`, headless, profile tạm độc lập, viewport 375/768/1440 × 1000. Thao tác qua DOM thật, IndexedDB/localStorage thật, clipboard thật; không coi đây là thử điện thoại thật.
- Working tree có thay đổi UI ngoài H. Toàn bộ kiểm tra image dùng UI `v1`, không phải giao diện mới chưa commit trên host.

## Checklist và bằng chứng

| Yêu cầu | Kết quả thực tế | Bằng chứng / giới hạn |
|---|---|---|
| Landing → thiết kế, tên tiếng Việt, crop, ba màu, lưu nhiều thẻ | PASS luồng tạo; FAIL dropdown chọn thẻ cũ | Chrome/Edge tạo 4 thẻ; cùng ảnh với 2 crop khác nhau. Dropdown chỉ đổi editing ID, không nạp nội dung/ảnh; sửa qua nút trong giỏ vẫn chạy |
| Ảnh EXIF đúng chiều, nén, cảnh báo chất lượng in | PASS fixture tổng hợp; CHƯA KIỂM TRA ảnh điện thoại thật | JPEG 600×900 orientation 6 được browser lưu metadata 900×600; crop khác nhau giữ sau reload. Ảnh giỏ có cảnh báo độ phân giải thấp. Cần người dùng thử ảnh chụp dọc từ điện thoại thật |
| 4 thẻ → reload → sửa thẻ 2 không đổi thẻ khác, đồng bộ hai tab | PASS qua nút “Sửa thiết kế” trong giỏ | [Browser JSON](2026-11-11-acceptance-browser.json), hai browser; crop, ID và asset key của các thẻ khác giữ nguyên. Bỏ qua khác biệt biểu diễn signatureData rỗng/không có vì không đổi nội dung |
| Checkout → success, sao chép mã | PASS | Đặt cả 4 thẻ qua form thật, mã đúng HM-16 hex, clipboard bằng mã, giỏ rỗng sau thành công; cả Chrome/Edge |
| Đặt 3/4 thẻ, thẻ còn lại giữ trong giỏ | FAIL `v1` | Giỏ `v1` không có checkbox chọn từng thẻ; checkout nhận toàn bộ giỏ. Thay đổi UI host chưa nằm trong image này |
| Tra cứu chuẩn hóa SĐT, sai trả lỗi chung, khóa | PASS | API nhận khoảng trắng/+84/84-dấu gạch; 5 sai trả 404, lần tiếp theo dù đúng SĐT vẫn 429 kèm Retry-After. UI success → track với +84 qua ở hai browser. Mở khóa theo thời gian có regression MySQL thật (clock injection), không chờ 15 phút trên container |
| Nội dung, FAQ, chính sách, 404, back/forward | PASS | Browser đi qua các policy/about/contact và route không tồn tại; back/forward đúng. Chưa rà soát tính đúng thực tế của nội dung kinh doanh |
| Admin danh sách, tìm kiếm, phân trang, chi tiết và ảnh | PASS API; browser tìm mã/chi tiết qua | Original JPEG và preview PNG tải qua admin và decode; tìm exact/prefix, page 2 API qua; [admin browser JSON](2026-11-11-acceptance-admin-browser.json) |
| Admin trạng thái, hủy có lý do, version hai tab | PASS API và UI | Hai tab admin: tab đầu PATCH 200, tab cũ 409; UI hủy có lý do thành công. API kiểm tra history/allowlist không lộ lý do |
| Đổi giá giữ snapshot, tắt sản phẩm chặn đơn, thống kê | PASS API/MySQL; browser trang sản phẩm/stats render | Đơn cũ giữ giá, đơn mới nhận giá mới, inactive trả PRODUCT_INACTIVE; khôi phục sản phẩm sau thử. Thống kê đối chiếu 20 đơn, một đơn hủy |
| CSV tiếng Việt trong Excel | PASS BOM/UTF-8 bằng byte; CHƯA KIỂM TRA Excel | CSV có BOM EFBBBF, chuỗi tiếng Việt và không URL nhạc. Cần người dùng mở bằng Excel thật |
| Production bỏ ADMIN_ENABLED trả 404 | PASS | Container riêng không có biến admin, `/admin`, `/api/admin/orders`, `/api/admin/products` đều 404; `/health` 200, `/ready` 503 khi không có DB |
| Lookup không có PII/ảnh/nhạc, không Set-Cookie, uploads không public | PASS các response đã gọi | Allowlist chính xác 6 trường, mọi response trong scenario không Set-Cookie; URL storage và asset thiếu 404. Không khẳng định đã thử mọi endpoint/biến thể có thể có |
| Log không chứa thông tin người nhận, địa chỉ, nhạc/body đơn | PASS scenario fixture | So log với dữ liệu giả của scenario; log chỉ method/path/status/duration và thông báo vận hành an toàn |
| CSP/nosniff/referrer, Origin lạ | FAIL CSP của `v1`; bản sửa local PASS | `v1` có nosniff/no-referrer, Origin lạ 403 nhưng không có CSP. Bản sửa chặn inline script và không chặn luồng editor/checkout, xem bên dưới |
| DB không publish, non-root image, không .env trong image | PASS | [Runtime JSON](2026-11-11-acceptance-runtime.json); UID khác 0, user node, amd64, DB một network internal, image không có .env/docs/tasks/tests/.git |
| Down/up giữ dữ liệu; backup → xóa → restore | PASS local persistence và CI Linux backup/restore | [Persistence JSON](2026-11-11-acceptance-persistence.json): 23 đơn/29 items/58 ảnh, bytes và SHA-256 từng ảnh trước/sau bằng nhau. Backup/restore destructive chỉ chạy trên project tạm của CI release, không lặp Bash trên Windows |
| SIGTERM exit 0 | PASS | Local stop 645 ms, exit 0; CI cũng qua cho standalone/Compose trên Linux |
| Responsive 375/768/1440 trên hai browser | FAIL ở 375; 768/1440 không vượt bề rộng trên ba trang đã thử | Cả Chrome/Edge: home body 384 px, cart body 445 px ở viewport 375; html.scrollWidth bị che bởi overflow nên phải đo cả body. Design 375 và home/design/cart 768/1440 không vượt viewport. Còn kiểm tra cảm ứng/thiết bị thật |
| Lighthouse landing | ĐÃ ĐO: 99/95/100 | Performance / Accessibility / SEO; xem [HTML](2026-11-11-lighthouse-v1.report.html), [JSON](2026-11-11-lighthouse-v1.report.json). Lighthouse 13.6.0, mobile default simulated throttling, localhost Chrome headless. Accessibility còn lỗi contrast; không đặt ngưỡng đạt giả |
| 20 đơn liên tiếp, kết nối DB, CPU/RAM | PASS kịch bản 20 đơn; không chứng minh tải dài hạn | [API JSON](2026-11-11-acceptance-api.json): 20 HTTP 201, 85–122 ms, 20 ID khác nhau. Pool 1 sleep trước/sau, observer thêm 1 query; mẫu tài nguyên bên dưới |

## Các điểm tìm thấy

| Mã | Hiện tượng và cách tái hiện trên `v1` | Trạng thái |
|---|---|---|
| H-01 | GET HTML không có Content-Security-Policy | Đã sửa `security-headers.ts` ở working tree, thêm smoke regression. Chưa commit/phát hành |
| H-02 | Lưu thẻ → reload `/design` → chọn thẻ đó từ dropdown: ảnh/link/tên không được nạp, có thể sửa nhầm nội dung dựa trên draft cũ | Chưa sửa vì editor đang do người dùng chỉnh. Cần nối dropdown qua luồng restore/edit thật, gồm chọn “Thẻ mới” reset đúng draft; kiểm tra riêng trước khi đưa vào image mới |
| H-03 | Giỏ `v1` không chọn riêng 3 trong 4 thẻ để đặt | Chưa có trong image. Host đang có thay đổi giỏ/checkout ngoài H; cần review và nghiệm thu các thay đổi đó, không tự trộn vào release |
| H-04 | 375 px: home nội dung rộng 384, cart 445; ảnh chụp full-page cũng rộng hơn viewport | Chưa sửa UI. Cần sửa layout/min-width thực tế, không che bằng overflow-x:hidden rồi đánh dấu PASS |

Bản sửa CSP chỉ bật ở production để không chặn Vite HMR trong dev. `script-src`/`connect-src` chỉ self; object/base/frame embedding bị chặn; img hỗ trợ self/data/blob cho ảnh editor, style cho inline style React. Không thêm unsafe-inline vào script. Không có migration, thay đổi contract hay dependency ứng dụng.

Build local `harmea-web:h-csp` từ archive `v1` **chỉ thay security-headers.ts**, không đưa UI host vào. Image ID local: `sha256:b2c1ef341e3a3d61c6dd8cb4af43057c2b0ab94afdc56528021cfa446fa9fffa`; đây không phải digest release mới trên Docker Hub. [Bằng chứng CSP](2026-11-11-acceptance-csp.json): Chrome chặn script inline với `script-src-elem`. [Browser candidate](2026-11-11-acceptance-browser-csp.json): toàn bộ 10 luồng qua, vẫn ghi lỗi dropdown/chọn giỏ; không xuất hiện lỗi CSP trong luồng bình thường. Phép đo overflow chi tiết được bổ sung sau lượt candidate và nằm ở báo cáo browser `v1` cuối cùng.

## Số đo local

- Image `v1`: 413.396.711 byte theo inspect. Đây là size image local, không phải kích thước tải nén.
- Ba mẫu `docker stats --no-stream` trước, sau 10 và sau 20 đơn: app 39,94 / 60,62 / 67,82 MiB, CPU 0,01–0,03%; DB 451 / 451,6 / 451,6 MiB, CPU 0,42 / 4,58 / 0,54%. Không phải peak hoặc benchmark tải đồng thời; không suy ra EC2 có cùng tài nguyên.
- Persistence snapshot: 23 đơn/29 thiết kế, 58 ảnh tổng 6.910.774 byte, trung bình khoảng 300.468 byte/đơn. Chỉ dữ liệu giả ở thời điểm snapshot; các lượt browser sau đó có thêm đơn. Không dự báo dung lượng cho ảnh khách thật.
- Không thấy pool tăng sau 20 request; chưa chạy soak test, chưa kết luận không rò RAM khi vận hành nhiều ngày.

## Kiểm tra code sau sửa CSP

| Lệnh | Kết quả |
|---|---|
| typecheck, build, contract:check | PASS, contract 15 paths |
| format:check | PASS tại thời điểm kiểm tra, không format UI ngoài H |
| routes:check | PASS, 27 links |
| Các suite router/api/editor/checkout/admin/admin-extended/setup/prod-env/snapshots/runtime/storage/docker-fixture | 74 PASS, 1 SIGTERM skip trên Windows |
| test:storage:s3 với MinIO build và chạy local | 1 PASS; cùng MySQL thật, không gọi AWS |
| test:smoke sau CSP | 64 checks PASS |
| SIGTERM Linux, backup/restore SQL/volume | PASS trong CI release của `v1` |
| Browser acceptance `v1` | Scenario chạy xong; exit 1 vì lỗi dropdown, partial checkout, overflow là lỗi sản phẩm thật |
| Candidate CSP | Build PASS, policy thực thi PASS, browser luồng chính qua; chưa phải một release đã nghiệm thu đầy đủ |

## Tái chạy và file trong H

- `scripts/acceptance-h.mjs`: chạy API scenario chỉ trên container/project/port thử cố định và đúng digest; yêu cầu DB thử mới trống, `HARMEA_H_ACCEPTANCE=true`. Không chạy trên stack đang chứa đơn thật. Script ghi failure CSP riêng và trả exit 1 khi còn lỗi.
- `scripts/acceptance-browser.mjs`: cần Playwright cài sẵn ngoài ứng dụng, `HARMEA_PLAYWRIGHT_MODULE` trỏ file `playwright/index.mjs`; không thêm dependency. Kiểm tra project local trước khi thao tác, profile sạch cho mỗi browser, ghi JSON/ảnh; exit 1 khi có finding.
- Sửa backend `apps/api/src/middleware/security-headers.ts`, test `tests/smoke.mjs`; cập nhật README, DEPLOY, CHANGELOG, task H và roadmap. Không sửa UI/editor/SQL/migration/contract.
- JSON bằng chứng gồm API, browser release/candidate, admin browser, runtime, persistence, CSP; HTML/JSON Lighthouse và ảnh trong `assets/2026-11-11-h-*`. Ảnh chỉ có dữ liệu giả. File env, raw DB, uploads, token và log riêng không được đưa vào repo.

Lệnh browser đã chạy trong PowerShell (đường dẫn module tùy máy):

```powershell
$env:HARMEA_H_ACCEPTANCE = 'true'
$env:HARMEA_PLAYWRIGHT_MODULE = '<playwright đã cài>/index.mjs'
node scripts/acceptance-browser.mjs
```

Không commit, tạo branch, stash/reset, push, đổi tag `v1`, phát hành candidate hoặc triển khai server trong task H này.

## Phần còn lại để nghiệm thu

1. Hoàn thiện/review UI đang chỉnh: dropdown phải restore thiết kế, giỏ chọn 3/4 giữ thẻ thứ tư và layout 375 px. Chạy lại browser scenario trên image chứa đúng các sửa đổi, không dựa vào bản dev host.
2. Review CSP và các thay đổi, commit theo quy trình của người dùng; phát hành version mới, giữ nguyên `v1`. Lấy digest mới rồi chạy lại nghiệm thu trên digest đó trước bàn giao.
3. Người dùng mở `http://127.0.0.1:3187/design`, dùng ảnh điện thoại chụp dọc thật, xem chiều/nén/crop; không chỉ dùng fixture orientation tổng hợp. Stack hiện là `v1` để tái hiện lỗi.
4. Người dùng xuất CSV tại `/admin`, mở bằng Excel và xác nhận dấu tiếng Việt, cột và công thức không bị thực thi. Chỉ dùng dữ liệu giả của stack thử.
5. Kiểm tra nhìn/bấm/cảm ứng trên thiết bị thật và các trang chưa chụp đầy đủ; thử trình duyệt người dùng mục tiêu. Lighthouse local và headless không thay thế thử người dùng thật.
6. Người vận hành kiểm tra server/proxy/HTTPS/admin gate và S3 IAM/mã hóa nếu dùng; không có thao tác server/AWS trong H. R5 vẫn bỏ qua theo quyết định hiện hành.
