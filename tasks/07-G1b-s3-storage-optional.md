# G1b — (Tùy chọn) Lưu upload trên Amazon S3

**Trạng thái:** người dùng đã chọn mục 07 ngày 11/11/2026; đã triển khai driver local/S3, còn nghiệm thu MinIO/Docker. Bucket, IAM role và quyền truy cập do người vận hành tạo; task này chỉ viết code driver và tài liệu cấu hình. **Ước lượng:** 2–3 giờ. **Phụ thuộc:** G1. Báo cáo: [G1b](../docs/qa/2026-11-11-task-G1b.md).

## Khi nào cần

Khi muốn tách dữ liệu ảnh khỏi máy EC2 (đổi máy hoặc scale không mất ảnh) hoặc muốn dùng lifecycle và backup của S3. Với một EC2 và EBS có snapshot thì chưa cần.

## Thiết kế

- Interface `FileStorage { put(key, buffer, contentType), get(key): Readable, delete(key), exists(key) }` trong `apps/api/src/lib/storage/` (các phương thức bất đồng bộ). Hai driver: `local` và `s3` (dùng `@aws-sdk/client-s3`, đã duyệt trong D8). Chọn bằng `STORAGE_DRIVER`; mặc định local.
- Bucket **private**: Block Public Access bật, mã hóa SSE-S3. Không dùng URL public. Chỉ API admin sau gate được stream ảnh từ storage theo R1; không có API ảnh công khai cho chủ đơn. Không dùng presigned URL.
- Credentials lấy từ **IAM role gắn vào EC2** (instance profile), không đặt access key trong env. Ứng dụng cần quyền đọc/ghi/xóa object dưới prefix `uploads/`. Theo AGENTS.md hiện hành, không viết `deploy/iam-policy-s3.json` hoặc cấu hình hạ tầng AWS; người vận hành chịu trách nhiệm bucket, IAM và Block Public Access.
- Logic dọn file khi transaction tạo đơn lỗi vẫn hoạt động với S3. Chỉ có ảnh của đơn hàng (giỏ hàng lưu trên trình duyệt, không có kho ảnh trên server).
- Script `scripts/migrate-uploads-to-s3.mjs`: copy file local lên S3, kiểm tra checksum, có chế độ `--dry-run`.

## Test

Chạy toàn bộ suite với driver `local` qua interface mới. Driver `s3` test bằng MinIO trong `compose.storage-test.yaml` để kiểm tra put/get/delete, API admin, migration checksum và luồng tạo đơn lỗi phải dọn file. `tests/minio/Dockerfile` build nguồn MinIO chính thức từ commit `07c3a429bfed433e49018cb0f78a52145d4bedeb` của release `RELEASE.2025-09-07T16-13-09Z`; cấu hình thay cho image/binary registry không truy cập được tại lần kiểm tra. Không gọi AWS thật trong test. Suite S3 chỉ chấp nhận endpoint HTTP loopback và credential fixture riêng; không dùng credential AWS. MinIO standalone không cấu hình KMS nên test tắt header SSE-S3 bằng dependency injection; factory ứng dụng luôn bật SSE-S3. Chưa nghiệm thu build MinIO/Docker trên máy hiện tại.

## Prompt giao việc

```text
Thực hiện task G1b trong tasks/07-G1b-s3-storage-optional.md (người dùng đã chọn dùng S3). Đọc tasks/00-ROADMAP.md, AGENTS.md, apps/api/src/modules/orders/uploads.ts và mọi chỗ đọc/ghi storage.

Refactor lưu tệp qua interface FileStorage với driver local/s3, bucket private, server stream tệp chỉ sau admin gate, credentials qua IAM role, không viết cấu hình IAM/hạ tầng AWS theo AGENTS.md. Viết script migrate có dry-run và SHA-256, giữ file nguồn, không ghi đè object khác checksum. Test bằng MinIO, không gọi AWS thật. Nếu Docker/MinIO không chạy thì ghi rõ chưa nghiệm thu driver S3, không đánh dấu PASS bằng unit test thay thế.

Chạy typecheck, build và mọi test. Viết báo cáo docs/qa/<ngày>-task-G1b.md. Không commit, không tạo nhánh, không push: để thay đổi trong working tree cho Claude kiểm tra.
```
