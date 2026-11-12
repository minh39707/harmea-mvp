# Nhạc nền, theme navy và giá 89.000đ

Ngày: 11/11/2026 · Nhánh: `feat/F2-mysql` · HEAD nền: `12a20d8`.

Đã hoàn thành local theo yêu cầu người dùng. Không commit/push/phát hành image mới; `v1.1.0` và gói bàn giao trước giữ nguyên. Người dùng chọn dùng MP3 có sẵn trong Downloads thay vì embed YouTube.

## Nhạc nền

- Nguồn: `It s Been a Long Long Time.mp3` do người dùng cung cấp. Không tải hoặc trích âm thanh từ YouTube bằng agent; không khẳng định bản thu royalty-free hay đã có license phân phối.
- File dự án: `apps/web/public/audio/nen.mp3`, SHA-256 `5e437dca80309b1293723eb85c2a2b01e0f23b623d04007d0a0ce42e6ef6f6a4`.
- Giữ trọn bài khoảng 205,22 giây, chuyển mono 32 kHz MP3 VBR quality 3; 1.775.385 byte, bitrate trung bình khoảng 69 kbps. Chọn VBR để dưới 2 MB mà không cắt bài; 96 kbps cố định cho độ dài này sẽ khoảng 2,46 MB. Không thay đổi tệp nguồn.
- Badge “Chạm là phát nhạc / Tương thích iOS & Android” là button thật có aria-pressed, hỗ trợ click/bàn phím; có nút bật/tắt cố định trên các trang storefront.
- Audio `preload="none"`, không có src trước cú bấm. Chỉ gắn `/audio/nen.mp3` trong handler click và gọi play. Loop, âm lượng 35%; không tải từ bên thứ ba.
- Lưu on/off trong localStorage `harmea.music.enabled.v1`. Không tự phát sau reload ngay cả khi lựa chọn trước là on; có nút “Phát tiếp nhạc nền” để khách chủ động bật lại. Lỗi storage không chặn điều khiển nhạc.
- `/track` gỡ cả player/control và pause media cũ; `/admin` unmount storefront, pause và bỏ nguồn nhạc. Không chỉ ẩn giao diện rồi để nhạc tiếp tục phát.
- Lỗi tải/phát hiện thông báo, không giả vờ đang phát; bấm lại sẽ nạp lại file nếu media đang lỗi. Người dùng có thể hủy khi đang tải.
- CSP production thêm `media-src 'self'`, không mở YouTube/Spotify/iframe hoặc domain ngoài.

## Màu giao diện

Thêm tokens brand `#132b4f` (navy), hover `#0d1f3a`, light `#24456e`, soft `#edf2f8`, RGB `19,43,79`. Thay nhóm màu forest green, hover và các rgba xanh lá trên home, editor, cart, checkout/success, tracking, signature control bằng token navy. Không sửa ảnh thương hiệu hoặc ba màu thiết kế thẻ kem/xanh/hồng; giữ các màu trung tính và gold hiện có.

## Giá và migration

- Thêm `database/007_product_price_89000.sql`; không sửa migration cũ.
- Một transaction ghi lịch sử giá cũ → 89.000đ và tăng version sản phẩm nếu giá khác 89.000đ. Chỉ tác động sản phẩm hiện hành, không sửa orders/order_items.
- UI fallback khi đang tải sản phẩm đổi thành 89.000đ; giá tính đơn vẫn lấy server/MySQL, không tin client.
- Đã áp dụng migration qua adapter/runner hiện có trên DB dev và DB stack Docker local. Khi phát hành image mới, người vận hành cần chạy migrate trước khi bật app; đây là **migration mới so với v1.1.0**.
- [Bằng chứng migration](2026-11-11-price-89000-migration.json): 33 đơn có sẵn, checksum id/giá/tổng/snapshot sản phẩm trước/sau giống hệt; catalog mới là 89.000đ.
- Cập nhật các assertion phụ thuộc giá seed trong test checkout/admin-extended: đơn 4 bản tổng 356.000đ, history gồm 50.000 → 89.000 và thay đổi giá admin sau đó; vẫn kiểm tra rollback và snapshot.

## Kiểm tra thực tế

| Kiểm tra | Kết quả |
|---|---|
| Typecheck, build, contract:check, format:check | PASS; contract 15 paths |
| routes:check | PASS, 27 links |
| Các suite Node hiện có trừ S3 | 74 PASS, 1 SIGTERM skip Windows |
| S3 trên MinIO Docker local và MySQL thật | 1 PASS |
| Smoke sau cập nhật CSP | 64 checks PASS, gồm media-src self |
| Docker build linux/amd64 | PASS |
| Browser nhạc trên Chrome/Edge headless | 8 checks PASS, không failures |
| Browser giỏ/checkout/layout đầy đủ | 12 checks PASS, 18 layout qua ở 375/768/1440 px |

Image local `harmea-web:navy-music`, image ID `sha256:1be1807108aeeaa7ee3954718934a158acf2542c0e81141f5528b17c472b52d2`. App chỉ publish `127.0.0.1:3187`, dùng DB/volume thử riêng. Không gọi AWS/server thật. MinIO thử đã dọn sau test; app/DB thử giữ chạy cho người dùng xem.

[Browser nhạc](2026-11-11-music-navy-price-browser.json) kiểm tra không request audio trước click, real MP3 currentTime tăng, readyState, volume 0,35, loop/unmuted; pause thật của element cũ khi chuyển track/admin; lưu on/off và không tự phát sau reload; giả lập audio 404 rồi bỏ chặn để kiểm tra retry phát file thật. Kiểm tra computed button background navy và API giá 89.000.

[Browser luồng đầy đủ](2026-11-11-acceptance-browser-navy-music.json) kiểm tra tạo/sửa/reload/đồng bộ giỏ, checkout 3/4 giữ asset của thẻ chưa gửi, clipboard, lookup, nội dung/404/back-forward và layout. Không phát nhạc thì không phát sinh request media hay tài nguyên ngoài origin.

Ảnh: [home Chrome 375](assets/2026-11-11-h-navy-music-chrome-home-375.jpg), [cart Chrome 375](assets/2026-11-11-h-navy-music-chrome-cart-375.jpg), [design Edge 375](assets/2026-11-11-h-navy-music-msedge-design-375.jpg).

## Phạm vi file và giới hạn

- Mới: audio MP3/provenance README, hook/CSS nhạc, migration 007, script acceptance nhạc và bằng chứng QA.
- Sửa: Storefront/HomePage tích hợp nhạc; theme tokens và các CSS/inline icon xanh lá; UI fallback giá; CSP/smoke; assertion giá trong tests; README/docs03/CHANGELOG.
- Không đổi API contract, thêm thư viện, sửa snapshot đơn cũ, secret/env production, file backup hoặc gói bàn giao `v1.1.0`.
- Chrome/Edge desktop headless đã thử thật; chưa thử Safari/iOS/Android trên thiết bị thật, âm thanh loa thực hoặc mạng di động. Không suy ra nghe qua loa thực từ currentTime/decoder của headless.
- Bản mới chưa commit/push/phát hành; image và tài liệu bàn giao trước vẫn mô tả v1.1.0. Không đánh dấu thay đổi local là đã có trên server hoặc Docker Hub.
