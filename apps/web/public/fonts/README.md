# Font của Harméa

DM Sans (normal 400–700) và Playfair Display (normal 400–600, italic 400–500) được phục vụ từ `/fonts/` trên cùng origin với ứng dụng. Browser không gọi Google Fonts hoặc Google Static để tải font.

Các bản WOFF2 được tải ngày 11/11/2026 từ Google Fonts CSS API, giữ nguyên bytes. `manifest.json` ghi URL stylesheet, URL từng tệp, dung lượng và SHA-256 để đối chiếu nguồn. Khai báo `@font-face`, `unicode-range` và `font-display: swap` nằm trong `src/styles/fonts.css`; các subset chỉ được tải khi trang dùng ký tự tương ứng.

- [DM Sans trong kho Google Fonts](https://github.com/google/fonts/tree/main/ofl/dmsans): giấy phép tại `dm-sans-OFL.txt`.
- [Playfair Display trong kho Google Fonts](https://github.com/google/fonts/tree/main/ofl/playfairdisplay): giấy phép tại `playfair-display-OFL.txt`.

Cả hai giấy phép SIL Open Font License 1.1 được giữ nguyên cùng font khi phân phối. Không cần tải font từ mạng trong lúc build hoặc chạy ứng dụng.
