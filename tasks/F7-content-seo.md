# F7 — Router, trang nội dung và SEO

**Trạng thái:** chưa làm. **Ước lượng:** 3–4 giờ. **Phụ thuộc:** F4.

## Mục tiêu

Website có đủ các trang của một cửa hàng thật, điều hướng không reload trang, có trang 404, có meta SEO và chia sẻ mạng xã hội.

## Phạm vi file

`apps/web/src/shared/router.ts` (mới), `apps/web/src/app/` (App, Header, Footer), `apps/web/src/features/content/` (mới), `apps/web/index.html`, `apps/web/public/` (robots.txt, sitemap.xml, og-image), `apps/api/src/app.ts` (SPA fallback), tests.

## Kết quả phải có

- **Router tự viết** (khoảng 100 dòng): dựa trên History API, có `navigate()`, `<Link>`, match pattern `:id`, xử lý nút back/forward và cuộn lên đầu trang khi đổi route. Gom mọi route vào một bảng duy nhất. Không thêm react-router.
- **Trang mới:** `/` (landing: hero, cách hoạt động NFC 3 bước, CTA thiết kế ngay), `/design` (trang sản phẩm/editor hiện tại), `/about`, `/how-nfc-works`, `/faq` (dạng accordion bằng `<details>`), `/policies/shipping`, `/policies/returns`, `/policies/privacy`, `/contact` (hiển thị email và mạng xã hội, chưa cần form). Trang 404 riêng.
- Nội dung đặt trong file TS/Markdown tĩnh. Nội dung chưa được người dùng xác nhận thì đánh dấu `[CẦN XÁC NHẬN]` để dễ tìm. **Không nói thẻ tự phát nhạc.** Chính sách đổi trả, bảo mật và phí ship là bản nháp, có ghi chú người dùng phải duyệt trước khi chạy thật.
- **Server (`app.ts`):** thay danh sách route cố định bằng fallback: mọi GET không bắt đầu bằng `/api/` và không phải file tĩnh thì trả `index.html`. `/api/*` không tồn tại vẫn trả JSON 404. File tĩnh có hash trong `assets/` dùng `Cache-Control: public, max-age=31536000, immutable`, còn `index.html` dùng `no-cache`.
- **SEO:** mỗi route đặt `document.title` và meta description. `index.html` có Open Graph và Twitter card mặc định, `lang="vi"`, favicon. `robots.txt` chặn `/admin`, `/account`, `/track`. `sitemap.xml` liệt kê các trang công khai, base URL lấy từ biến build `VITE_PUBLIC_ORIGIN`.
- Trang `/track` và `/reset-password` có `<meta name="referrer" content="no-referrer">` và không tải tài nguyên bên thứ ba (để token không lọt ra ngoài).
- Footer có link tới các trang chính sách, liên hệ và năm hiện tại.
- Accessibility cơ bản: có landmark, focus hiển thị rõ, alt cho ảnh, kiểm tra độ tương phản bằng tokens.

## Hoàn thành khi

1. Unit test router: match, param, 404, chặn `navigate` tới URL ngoài site.
2. Test HTTP: `/faq` và `/account/orders/abc` trả HTML; `/api/khong-co` trả JSON 404; `/assets/x.js` có header cache đúng.
3. Build qua, link nội bộ không gãy (viết script kiểm tra các `<Link to>` có route tương ứng).
4. Có báo cáo `docs/qa/<ngày>-task-F7.md`, trong đó liệt kê danh sách mục `[CẦN XÁC NHẬN]` để người dùng duyệt.

## Prompt giao việc

```text
Thực hiện task F7 trong tasks/F7-content-seo.md. Đọc tasks/00-ROADMAP-v2.md, AGENTS.md, docs/01 (thông tin sản phẩm, không nói tự phát nhạc), apps/web/src/app/*, apps/api/src/app.ts.

Viết router nhỏ dựa trên History API (không thêm thư viện), thêm landing và các trang nội dung/chính sách/FAQ/liên hệ/404, SPA fallback ở server với header cache đúng, meta SEO/OG, robots.txt, sitemap.xml, no-referrer cho trang có token. Nội dung chưa xác nhận đánh dấu [CẦN XÁC NHẬN], không tự bịa chính sách như thể đã chốt.

Viết unit test router và test HTTP cho fallback. Chạy typecheck, build và mọi test. Viết báo cáo docs/qa/<ngày>-task-F7.md có danh sách mục cần người dùng duyệt, commit trên nhánh feat/F7-content-seo. Không push.
```
