import sharp from 'sharp';
import { openDatabase } from '../apps/api/src/db.ts';
import { createOrder } from '../apps/api/src/modules/orders/create.ts';
import { updateStatus } from '../apps/api/src/modules/orders/state.ts';
import { blankDesign } from '../apps/web/src/shared/types.ts';
import { orderDesign } from '../apps/web/src/features/editor/validate-design.ts';
import { cardSvg } from '../apps/web/src/features/editor/card-svg.ts';
import { centerCrop } from '../apps/web/src/features/editor/geometry.ts';
import { createFileStorage } from '../apps/api/src/lib/storage/index.ts';

// Run with the API stopped while preparing local demo fixtures.
const db = await openDatabase();
const storage = createFileStorage();
try {
  const photo = await sharp({
    create: { width: 120, height: 80, channels: 3, background: '#8facb8' }
  })
    .jpeg()
    .toBuffer();
  for (const [suffix, name, states] of [
    ['01', 'DEMO HOÀN TẤT', ['confirmed', 'producing', 'shipping', 'completed']],
    ['02', 'DEMO ĐÃ HỦY', ['cancelled']]
  ]) {
    const requestKey = `dddddddd-dddd-4ddd-8ddd-dddddddddd${suffix}`;
    const prior = (
      await db.query('SELECT id,order_number,status FROM orders WHERE request_key=?', [requestKey])
    ).rows[0];
    if (prior) {
      console.log(`Giữ nguyên: ${prior.order_number} (${prior.status}).`);
      continue;
    }
    const design = {
      ...blankDesign,
      fullName: name,
      musicUrl: 'https://open.spotify.com/track/demo-placeholder',
      photo: 'data:image/jpeg;base64,' + photo.toString('base64'),
      photoWidth: 120,
      photoHeight: 80,
      crop: centerCrop(120, 80)
    };
    const preview = await sharp(Buffer.from(cardSvg(design)))
      .png()
      .toBuffer();
    const form = new FormData();
    form.set(
      'payload',
      JSON.stringify({
        requestKey,
        designConfirmed: true,
        recipient: {
          name: 'Khách Demo',
          phone: '0900000000',
          address: 'Địa chỉ hư cấu dùng diễn tập'
        },
        note: 'DEMO hư cấu — không sản xuất, không giao hàng thật',
        items: [
          {
            productId: '11111111-1111-4111-8111-111111111111',
            templateVersion: 'harmea-card-v1',
            quantity: 2,
            design: orderDesign(design)
          }
        ]
      })
    );
    form.set('photo_0', new Blob([photo], { type: 'image/jpeg' }), 'demo.jpg');
    form.set('preview_0', new Blob([preview], { type: 'image/png' }), 'demo.png');
    const receipt = await createOrder(db, storage, form);
    let version = 1;
    for (const status of states)
      await updateStatus(
        db,
        String(receipt.id),
        {
          expectedVersion: version++,
          status,
          ...(status === 'cancelled' ? { cancellationReason: 'Hủy đơn diễn tập hư cấu' } : {})
        },
        'system'
      );
    console.log(`Đã tạo: ${receipt.orderNumber} (${states.at(-1)}).`);
  }
  console.log('Tra cứu đơn demo tại /track bằng mã đơn và số điện thoại demo.');
} catch {
  console.error(
    'Không chuẩn bị được demo. Dừng API, kiểm tra migration và cấu hình DB; đơn đã tồn tại được giữ nguyên, không tự chạy lại trạng thái.'
  );
  process.exitCode = 1;
} finally {
  storage.close?.();
  await db.close();
}
