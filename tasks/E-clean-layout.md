# E — Dọn bố cục dự án và tối giản giao diện

**Trạng thái:** cần triển khai. **Nhánh:** `refactor/clean-layout`. **Dự kiến:** 4–6 giờ.

**Cập nhật 29/10/2026:** đã triển khai Giai đoạn 1 (bước 1–3), giữ mốc smoke 30/22/8. Chưa kiểm tra bằng tay trên trình duyệt do browser host/native pipe không khả dụng; chưa nghiệm thu trực quan. Giai đoạn 2 chưa làm, chờ sau D. Chi tiết: [báo cáo E1](../docs/qa/2026-10-29-clean-layout.md). Các mục “Trạng thái hiện tại” và đường dẫn bên dưới mô tả mốc trước refactor để tham chiếu.

Mục tiêu: code dễ đọc, chia đúng thư mục theo `docs/02-architecture.md`, giao diện gọn và tối giản hơn. **Hành vi nghiệp vụ và API giữ nguyên.** Đây không phải task sửa lỗi contract/admin (QA-01 đến QA-05 làm ở task khác).

## Đã chốt với chủ dự án

- **Giữ giỏ hàng** và luồng hiện tại: sản phẩm → giỏ → checkout → success → tracking.
- **Được dùng Prettier** (đã cài, chỉ dùng lúc dev). Không thêm thư viện, framework hay ORM nào khác.
- Làm cả hai giai đoạn theo thứ tự: E Giai đoạn 1 → A → B → C → D → E Giai đoạn 2. Không redesign ngay sau khi dọn cấu trúc.
- Trước khi triển khai A, đồng bộ quyết định giữ giỏ hàng vào `contracts/openapi.json`, docs/01–03 và task A/C. Giai đoạn 1 của E chỉ giữ hành vi hiện tại, không tự thay hợp đồng.

## Trạng thái hiện tại

- Nhánh `refactor/clean-layout` đã có hai commit:
  - `7a5f2ba`: báo cáo QA `docs/QA-2026-10-29.md`, bằng chứng `docs/qa-evidence-2026-10-29.json`, script `scripts/qa-smoke.mjs`, sửa kiểu `items` trong `commerce.ts`.
  - `d18d6aa`: thêm Prettier (`.prettierrc.json`, `.prettierignore`, `npm run format`, `npm run format:check`) và chạy định dạng toàn bộ code, không đổi logic.
- Frontend: toàn bộ UI nằm trong `apps/web/src/App.tsx` (khoảng 1000 dòng) và `apps/web/src/style.css` (khoảng 1300 dòng). `features/` mới có README.
- Backend: `apps/api/src/commerce.ts` gộp validate, xử lý ảnh, catalog, checkout và tracking. `app.ts` chứa luôn middleware chặn Origin và rate limit. `modules/` mới có README.

## Mốc kiểm tra Giai đoạn 1 (phải giữ nguyên)

`node scripts/qa-smoke.mjs` hiện cho **30 phép kiểm tra: 22 khớp, 8 không khớp**. Sau giai đoạn 1, kết quả phải giống hệt: cùng tên phép kiểm tra, cùng `actual`, cùng `pass`. 8 phép không khớp là lỗi đã biết, không thuộc task này:

```
catalog contract fields              (actual 7)
duplicate request per P0 contract    (actual 200)
contract create endpoint exists      (404)
contract lookup endpoint resolves    (404)
admin session implemented            (404)
admin orders requires authentication (404)
admin login page served              (404)
snapshot has preview PNG             (false)
```

## Lưu ý kỹ thuật trước khi làm

1. **`scripts/qa-smoke.mjs` ghi đè `docs/qa-evidence-2026-10-29.json` mỗi lần chạy.** File này là bằng chứng QA gốc. Phải sửa script trước khi chạy lần đầu (bước 1). Nếu lỡ ghi đè, khôi phục bằng `git checkout -- docs/qa-evidence-2026-10-29.json`.
2. Máy chưa cấu hình danh tính git. Commit bằng `git -c user.name=namlqmb111 -c user.email=namlqmb111@gmail.com commit ...`. Không sửa git config global.
3. Windows/PowerShell: dùng `npm.cmd`, `npx.cmd`.
4. API chạy TypeScript trực tiếp bằng Node 24 (`erasableSyntaxOnly`, `rewriteRelativeImportExtensions`, `verbatimModuleSyntax`):
   - import tương đối trong `apps/api` và `scripts` **phải có đuôi `.ts`**;
   - không dùng `enum`, `namespace` hay parameter properties;
   - import kiểu dùng `import type`.
5. Không sửa `database/001–003*.sql` và `contracts/openapi.json`. Không đổi route, status code, message lỗi hay hình dạng response.
6. Không đọc, log hay commit `.env`, `.local-admin.txt`, `storage/`.
7. Mỗi bước: chạy `npm.cmd run format`, `typecheck`, `build`, smoke, rồi commit riêng. Kết thúc commit message bằng dòng `Co-Authored-By` theo quy ước của công cụ bạn dùng.

## Giai đoạn 1 — Dọn cấu trúc (không đổi hành vi)

### Bước 1: Tài liệu QA và test

- Chuyển file bằng `git mv` để giữ lịch sử:
  - `VERIFICATION.md` → `docs/qa/2026-10-27-starter-verification.md`
  - `docs/QA-2026-10-29.md` → `docs/qa/2026-10-29-qa-report.md`
  - `docs/qa-evidence-2026-10-29.json` → `docs/qa/2026-10-29-qa-evidence.json`
  - `scripts/qa-smoke.mjs` → `tests/smoke.mjs`
- Sửa `tests/smoke.mjs`:
  - import `../apps/api/src/...` vẫn đúng vì cùng độ sâu, giữ nguyên;
  - **bỏ việc ghi file mặc định**: chỉ ghi khi có cờ `--out <path>`, còn lại chỉ in ra console;
  - sửa comment dòng 1 thành `npm run test:smoke [-- --out <file>]`.
- `package.json`: thêm script `"test:smoke": "node tests/smoke.mjs"`.
- Báo cáo QA: thêm một dòng ghi chú ở đầu ("số dòng trong báo cáo ứng với commit `7a5f2ba`; script và bằng chứng đã chuyển sang ..."), và sửa lệnh chạy lại thành `npm.cmd run test:smoke`. **Không sửa nội dung các phát hiện.**
- README: link `VERIFICATION.md` trỏ sang `docs/qa/`. `docs/02-architecture.md` mục 3: thêm `tests/` và `docs/qa/`.

### Bước 2: Tách backend

Cấu trúc đích, theo `apps/api/src/modules/README.md`:

```
apps/api/src/
  server.ts                giữ nguyên (đọc secret, mở DB, listen)
  app.ts                   chỉ lắp middleware, router, static, 404, error handler
  db.ts                    giữ nguyên
  middleware/
    security-headers.ts    Referrer-Policy, X-Content-Type-Options
    api-guard.ts           Cache-Control no-store + kiểm tra Origin + rate limit (giữ đúng thứ tự và allowlist hiện tại)
  lib/
    errors.ts              InputError + helper gửi lỗi {error:{code,message}}
    validate.ts            object(), text(), date(), uuid regex, isAllowedMusicUrl()
    crypto.ts              hash() sha256
  modules/
    catalog/router.ts      GET /products/current
    checkout/router.ts     POST /demo-checkouts (chỉ parse HTTP và trả response)
    checkout/service.ts    validate payload, chuẩn hóa ảnh bằng sharp, idempotency, transaction
    checkout/repository.ts các câu SQL có tham số trên demo_checkouts/products
    checkout/receipt.ts    receipt() + tokenFor() (HMAC dùng secret)
    tracking/router.ts     POST /demo-tracking (response dùng allowlist như cũ)
    index.ts               apiRouter(db, secret) gộp 3 router; app.ts dùng thay commerceRouter
```

- Xóa `commerce.ts` sau khi chuyển hết. Giữ nguyên từng chuỗi lỗi tiếng Việt, mã lỗi, status code và thứ tự kiểm tra, vì smoke test so cả status.
- Danh sách host nhạc đang lặp ở web (`App.tsx`) và API (`commerce.ts`). Mỗi bên giữ một bản trong module của mình; không tạo package dùng chung.
- Giữ đúng ngữ nghĩa transaction và `ON CONFLICT(request_key)`.
- Kiểm tra: smoke phải ra đúng mốc 22/8.

### Bước 3: Tách frontend

Cấu trúc đích, theo `apps/web/src/features/README.md` và `docs/02-architecture.md`:

```
apps/web/src/
  main.tsx                 import './styles/index.css'; bỏ comment "Deliberately no product UI yet"
  app/
    App.tsx                state điều hướng (view), product, cart, notice; ghép các page
    Header.tsx, Footer.tsx, Toast.tsx
  features/
    editor/                ProductPage.tsx, DesignForm.tsx, CardPreview.tsx (component Card), photo.ts (nén ảnh), music-url.ts
    cart/                  CartPage.tsx, cart-storage.ts (loadCart/saveCart, key 'harmea.cart.v2')
    checkout/              CheckoutPage.tsx, SuccessPage.tsx, useCheckout.ts (requestKey/signature, gọi API)
    tracking/              TrackingPage.tsx, useTracking.ts (lookup, đọc hash)
  shared/
    api.ts                 api<T>()
    format.ts              money(), colorLabel() (bỏ ternary màu lặp 2 lần)
    types.ts               Design, Item, Product, Receipt, View, blankDesign
    ui/                    Quantity.tsx, BagIcon.tsx
  styles/
    tokens.css, base.css, layout.css
    (mỗi feature một file .css cạnh component, import trong component)
```

- Tách theo thứ tự: types và hàm thuần → component trình bày → state/hook. Mỗi lần tách xong một phần thì build lại.
- Giữ nguyên: key localStorage, payload gửi API, đọc `location.hash` cho `/track#token`, `history.replaceState`, scroll, các `aria-*`, `role="alert"` và `role="status"`.
- Không dùng router library. Không lưu token hay thông tin admin vào localStorage.
- Bước này chỉ chia CSS sang nhiều file, chưa đổi giao diện. Chụp màn hình trước và sau phải giống nhau.

## Giai đoạn 2 — Giao diện tối giản

**Phụ thuộc:** chỉ bắt đầu sau khi task D hoàn thành, trên nền API/editor/checkout/admin đã tích hợp từ A–D. Nếu chủ dự án yêu cầu giao diện cho buổi trình bày sớm, có thể đưa giai đoạn này lên sau Giai đoạn 1 và ghi rõ phần cần kiểm tra lại sau A–D.

Mốc 30/22/8 chỉ áp dụng Giai đoạn 1. Trước Giai đoạn 2, ghi nhận bộ kiểm tra và kết quả mới sau A–D; không giữ lại lỗi đã sửa chỉ để khớp mốc cũ.

Nguyên tắc: ít lớp trang trí hơn, mỗi màn hình một ý chính, một hành động chính. Giữ chất "quà tặng" qua font serif ở tiêu đề và màu gold, nhưng dùng tiết chế.

### Design tokens (`styles/tokens.css`)

- Màu: `--bg #faf9f5`, `--surface #ffffff`, `--text #292c27`, `--muted #6f7268` (kiểm tra tương phản ≥ 4.5:1 trên nền), `--line #e4e3da`, `--accent #a58143`, `--danger`. Thay mọi mã màu viết cứng trong CSS bằng token. Riêng 3 màu thẻ cream/blue/rose được giữ giá trị riêng trong `CardPreview.css`.
- Font: Playfair Display chỉ dùng cho `h1` và wordmark; còn lại DM Sans.
- Cỡ chữ: 4 cấp, ví dụ 13 / 15 / 20 / 40px (`h1` dùng `clamp`).
- Khoảng cách: bội số 8 (`--space-1` … `--space-8`). Một giá trị `--radius` (6px) và một `--border` (1px).

### Bỏ hoặc gộp (theo tên class hiện có)

- `.announcement`, `.demo-label`: bỏ thanh trên cùng, thay bằng badge "Demo" nhỏ cạnh wordmark.
- `.breadcrumb`, `.gold-dot`, `.pills`, `.gallery-note`, `.image-tag`, `.image-caption`, `.form-heading`, `.product-name` (trùng với `h1`), `.swatch-card`: bỏ.
- `.eyebrow`: mỗi trang tối đa một cái, hoặc bỏ hẳn.
- `.fineprint`, `.test-note`, `.muted`: gộp thành một kiểu `.note`. **Mỗi trang chỉ nói "demo, không thu tiền" một lần**, đặt ngay dưới nút hành động chính.
- `.gallery-controls` (thumbnail): thay bằng nút segmented nhỏ "Ảnh thật / Thiết kế của bạn" dưới ảnh.

### Từng màn hình

- **Header:** cao 64px (hiện 100px). Gồm wordmark + badge Demo, 2 link (Sản phẩm, Tra cứu đơn), icon giỏ có số lượng. Bỏ link "Cách sử dụng".
- **Footer:** một dòng gồm wordmark nhỏ và câu "dự án sinh viên, không liên kết với nền tảng âm nhạc".
- **Sản phẩm:** hai cột ở desktop, một cột ở mobile.
  - Bên trái: preview (ảnh thật hoặc `CardPreview`) và nút chuyển ảnh.
  - Bên phải: `h1`, một câu mô tả, giá + ghi chú "giá demo", form.
  - Form: chọn màu (3 chấm tròn + tên màu), 2 trường bắt buộc, `<details>` cho các trường tùy chọn (giữ nguyên), rồi số lượng và nút thêm vào giỏ.
  - "Cách sử dụng": 3 bước ngắn, mỗi bước một tiêu đề và một dòng. FAQ giữ 3 câu.
- **Giỏ:** danh sách item (thumbnail, tên, màu, nút sửa/xóa, số lượng, giá), tóm tắt dính bên phải ở desktop. Trạng thái giỏ trống gồm một câu và một nút.
- **Checkout:** cùng khung với giỏ. Form người nhận bên trái, tóm tắt và nút xác nhận bên phải.
- **Success:** một card ở giữa trang, gồm mã đơn, ô link theo dõi, 2 nút (Sao chép, Xem đơn) và một ghi chú.
- **Tracking:** một card ở giữa trang, gồm ô nhập + nút. Kết quả hiện trong cùng card.
- **Toast và lỗi:** cùng một kiểu, góc dưới màn hình, có `role` như cũ.

### Lỗi do task B/C phụ trách

- **QA-06 thuộc task B:** `CardPreview` hiển thị `dateOfBirth` nếu có nhập, đồng nhất với preview PNG.
- **QA-07 thuộc task C:** sau khi checkout thành công, reset `requestKey` và `signature` để lần đặt mới không bị trả về đơn cũ; giữ khóa cho retry của lần gửi chưa rõ kết quả.
- E không triển khai lại hai lỗi này. Khi refactor/redesign, giữ nguyên các sửa lỗi đã có và kiểm tra hồi quy.

### Responsive và truy cập

- Kiểm tra ở 375px, 768px, 1440px: không cuộn ngang, nút bấm cao ít nhất 44px, `:focus-visible` rõ ràng.
- Thêm `prefers-reduced-motion` để tắt smooth scroll.
- Giữ `alt` cho ảnh và `aria-label` cho các nút chỉ có icon.

## Hoàn thành khi

1. `npm.cmd run format:check`, `typecheck`, `build`, `contract:check` đều qua.
2. Sau Giai đoạn 1, `npm.cmd run test:smoke` cho đúng **30 / 22 / 8** như mốc, cùng tên phép kiểm tra. Sau Giai đoạn 2, các kiểm tra cập nhật sau A–D không được có hồi quy so với mốc ghi nhận trước redesign.
3. `App.tsx` dưới 150 dòng. Không còn file nào trong `apps/web/src` hay `apps/api/src` dài quá 250 dòng. `commerce.ts` không còn.
4. Đi lại bằng tay trên trình duyệt: thêm 2 thiết kế vào giỏ → sửa một thiết kế → checkout bằng dữ liệu giả → sao chép link → mở `/track#token` → thấy đơn. Reload trang vẫn còn giỏ. Làm ở cả desktop và 375px.
5. Không còn mã màu viết cứng ngoài `tokens.css` và `CardPreview.css`.

## Báo cáo khi xong

- Tạo `docs/qa/<ngày>-clean-layout.md`: liệt kê những gì đã làm, kết quả lệnh và smoke thực tế, ảnh chụp trước/sau (nếu có trình duyệt), giới hạn còn lại.
- **Ghi rõ phần nào chưa kiểm tra bằng trình duyệt. Không đánh dấu PASS nếu chưa chạy.**
- Cập nhật README: mục "Đã có / cần làm tiếp" (QA-08) và cấu trúc thư mục mới. Không ghi các endpoint kế hoạch là đã triển khai.

## Prompt giao việc

```text
Triển khai task E trong tasks/E-clean-layout.md trên nhánh refactor/clean-layout. Đọc AGENTS.md, README.md, docs/02-architecture.md, docs/QA-2026-10-29.md và toàn bộ task E trước khi sửa.

Làm Giai đoạn 1 (bước 1 → 3), mỗi bước một commit, rồi bàn giao để thực hiện A → B → C → D. Chỉ bắt đầu Giai đoạn 2 sau khi D hoàn thành, trừ khi chủ dự án yêu cầu ưu tiên giao diện cho buổi trình bày sớm. QA-06 do task B sửa, QA-07 do task C sửa; E chỉ kiểm tra hồi quy.

Giai đoạn 1 không được đổi hành vi: smoke test phải giữ đúng mốc 30/22/8. Việc đầu tiên là sửa smoke script để không ghi đè docs/qa-evidence-2026-10-29.json. Không sửa migration, OpenAPI hay route API; không thêm dependency. Giai đoạn 2 redesign tối giản theo danh sách trong task, giữ giỏ hàng và mọi thuộc tính a11y, dùng mốc kiểm tra mới sau A–D.

Sau mỗi bước chạy format, typecheck, build, test:smoke. Cuối cùng viết báo cáo docs/qa/<ngày>-clean-layout.md với kết quả thực tế; nói rõ phần nào chưa kiểm tra bằng trình duyệt.
```
