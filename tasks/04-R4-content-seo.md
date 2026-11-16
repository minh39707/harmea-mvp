# R4 — Router, trang nội dung và SEO

**Trạng thái:** đã triển khai; còn browser QA. **Ước lượng:** 3–4 giờ. **Phụ thuộc:** R1 (nên làm sau R2 để tránh xung đột file ở `app/`). Báo cáo: [docs/qa/2026-11-11-task-R4.md](../docs/qa/2026-11-11-task-R4.md).

## Mục tiêu

Website có đủ các trang của một cửa hàng, điều hướng không reload trang, có trang 404, có meta SEO, và một image chạy được ở bất kỳ domain nào.

## Phạm vi file

`apps/web/src/shared/router.ts` (mới), `apps/web/src/app/` (App, Header, Footer), `apps/web/src/features/content/` (mới), `apps/web/src/features/home/` (đã có trong working tree; tích hợp, không viết lại), `apps/web/index.html`, `apps/api/src/app.ts` (SPA fallback, robots, sitemap), tests.

## Kết quả phải có

- **Router tự viết** (khoảng 100 dòng): History API, `navigate()`, `<Link>`, pattern `:id`, xử lý back/forward, cuộn lên đầu trang khi đổi route. Một bảng route duy nhất. Không thêm react-router.
- **Trang:** `/` (landing, dùng `features/home` đã có), `/design` (editor), `/cart`, `/checkout`, `/track` (tra cứu mã đơn + SĐT từ R1), `/about`, `/how-nfc-works`, `/faq` (dạng `<details>`), `/policies/shipping`, `/policies/returns`, `/policies/privacy`, `/contact`, trang 404. Giữ các đường dẫn cũ đang dùng (ví dụ `/product`) bằng redirect hoặc alias.
- Nội dung chưa được người dùng xác nhận thì đánh dấu `[CẦN XÁC NHẬN]`. **Không nói thẻ tự phát nhạc.** Chính sách bảo mật phải nêu: không có tài khoản; ảnh và giỏ hàng lưu trên trình duyệt của khách cho tới khi đặt đơn; ảnh đơn hàng được lưu để sản xuất; metadata EXIF/GPS bị xóa; tra cứu đơn cần mã đơn + SĐT.
- **Server (`app.ts`):** thay danh sách route cố định bằng fallback chung: mọi GET không bắt đầu bằng `/api/`, không phải `/health`, `/ready`, `/robots.txt`, `/sitemap.xml`, `/admin*` (admin đi qua gate của R1) và không phải file tĩnh thì trả `index.html`. `/api/*` không tồn tại vẫn trả JSON 404. Header cache: `assets/*` có hash dùng `public, max-age=31536000, immutable`; `index.html` dùng `no-cache`.
- **SEO:** mỗi route đặt `document.title` và meta description; `index.html` có OG/Twitter card, `lang="vi"`, favicon. **`robots.txt` và `sitemap.xml` do server sinh lúc chạy từ `APP_URL`**, không phụ thuộc biến lúc build. `robots.txt` chặn `/admin`, `/track`, `/checkout`, `/cart`.
- Trang `/track` có `<meta name="referrer" content="no-referrer">`, không tải tài nguyên bên thứ ba.
- Footer có link chính sách, liên hệ, năm hiện tại. Accessibility cơ bản: landmark, focus rõ, alt ảnh.

## Hoàn thành khi

Unit test router (match, param, 404, chặn navigate ra ngoài site). Test HTTP: `/faq` trả HTML; `/api/khong-co` trả JSON 404; `/admin` khi gate tắt vẫn 404 (fallback không được nuốt); `/robots.txt` dùng `APP_URL`; header cache đúng. Script kiểm tra mọi `<Link to>` đều có route. Báo cáo `docs/qa/<ngày>-task-R4.md` có danh sách mục `[CẦN XÁC NHẬN]`.

## Prompt giao việc

```text
Thực hiện task R4 trong tasks/04-R4-content-seo.md. Đọc tasks/00-ROADMAP.md, AGENTS.md, docs/01, báo cáo R1/R2, apps/web/src/app/*, apps/web/src/features/home/*, apps/api/src/app.ts.

Viết router nhỏ dựa trên History API (không thêm thư viện), tích hợp trang home đã có, thêm các trang nội dung, chính sách, FAQ, liên hệ, 404. Thêm SPA fallback chung ở server với header cache đúng và không nuốt /api, /health, /ready, /robots.txt, /sitemap.xml, /admin. robots.txt và sitemap.xml sinh lúc chạy từ APP_URL. Meta SEO/OG, no-referrer cho /track. Nội dung chưa xác nhận đánh dấu [CẦN XÁC NHẬN], không bịa chính sách như thể đã chốt.

Viết unit test router và test HTTP. Chạy typecheck, build, format:check (file R4 sửa) và mọi test. Viết báo cáo docs/qa/<ngày>-task-R4.md có danh sách mục cần người dùng duyệt. Không commit, không tạo nhánh, không push: để thay đổi trong working tree cho Claude kiểm tra.
```
