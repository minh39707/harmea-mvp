# G1b — (Tùy chọn) Lưu upload trên Amazon S3

**Trạng thái:** chưa làm, **chỉ làm khi người vận hành server yêu cầu lưu ảnh trên S3**. Bucket, IAM role và quyền truy cập do người vận hành tạo; task này chỉ viết code driver và tài liệu cấu hình. **Ước lượng:** 2–3 giờ. **Phụ thuộc:** G1.

## Khi nào cần

Khi muốn tách dữ liệu ảnh khỏi máy EC2 (đổi máy hoặc scale không mất ảnh) hoặc muốn dùng lifecycle và backup của S3. Với một EC2 và EBS có snapshot thì chưa cần.

## Thiết kế

- Interface `FileStorage { put(key, buffer, contentType), get(key): Readable, delete(key), exists(key) }` trong `apps/api/src/lib/storage/`. Hai driver: `local` (code hiện tại, refactor sang interface) và `s3` (dùng `@aws-sdk/client-s3`, đã duyệt trong D4). Chọn bằng `STORAGE_DRIVER`.
- Bucket **private**: Block Public Access bật, mã hóa SSE-S3. Không dùng URL public. Admin hoặc chủ đơn tải ảnh qua endpoint có xác thực, server stream từ S3 về (giữ nguyên quy tắc AGENTS.md). Không dùng presigned URL, trừ khi người dùng đồng ý sau.
- Credentials lấy từ **IAM role gắn vào EC2** (instance profile), không đặt access key trong env. Policy tối thiểu: `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` trên `arn:aws:s3:::<bucket>/uploads/*`. Ghi policy mẫu vào `deploy/iam-policy-s3.json` để người vận hành tham khảo khi tạo role.
- Logic dọn file khi transaction tạo đơn lỗi vẫn hoạt động với S3.
- Script `scripts/migrate-uploads-to-s3.mjs`: copy file local lên S3, kiểm tra checksum, có chế độ `--dry-run`.

## Test

Chạy toàn bộ suite với driver `local` qua interface mới. Driver `s3` test bằng MinIO trong compose test (`minio/minio`, chỉ dùng cho test) để kiểm tra put/get/delete và luồng tạo đơn lỗi phải dọn file. Không gọi AWS thật trong test.

## Prompt giao việc

```text
Thực hiện task G1b trong tasks/G1b-s3-storage.md (người dùng đã chọn dùng S3). Đọc tasks/00-ROADMAP-v2.md, AGENTS.md, apps/api/src/modules/orders/uploads.ts và mọi chỗ đọc/ghi storage.

Refactor lưu tệp qua interface FileStorage với driver local/s3, bucket private, server stream tệp sau khi xác thực, credentials qua IAM role, viết policy IAM tối thiểu và script migrate có dry-run. Test bằng MinIO, không gọi AWS thật.

Chạy typecheck, build và mọi test. Viết báo cáo docs/qa/<ngày>-task-G1b.md, commit trên nhánh feat/G1b-s3. Không push.
```
