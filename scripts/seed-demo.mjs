import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import sharp from 'sharp';
import { openDatabase } from '../apps/api/src/db.ts';
import { createOrder } from '../apps/api/src/modules/orders/create.ts';
import { updateStatus } from '../apps/api/src/modules/orders/state.ts';
import { blankDesign } from '../apps/web/src/shared/types.ts';
import { orderDesign } from '../apps/web/src/features/editor/validate-design.ts';
import { cardSvg } from '../apps/web/src/features/editor/card-svg.ts';
import { centerCrop } from '../apps/web/src/features/editor/geometry.ts';

// Run with the API stopped: PGlite permits one process per data directory.
const db = await openDatabase();
const linksPath = resolve(process.env.DEMO_LINKS_FILE ?? 'storage/demo-links.json');
try {
  let links = {};
  try {
    links = JSON.parse(await readFile(linksPath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
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
      await db.query('SELECT order_number,status FROM orders WHERE request_key=$1', [requestKey])
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
    const receipt = await createOrder(
      db,
      resolve(process.env.UPLOAD_DIR ?? 'storage/uploads'),
      form
    );
    // Save the once-issued token before any status updates; never print it.
    links[receipt.orderNumber] = {
      path: `/track#${receipt.trackingToken}`,
      musicUrlIsPlaceholder: true
    };
    await mkdir(dirname(linksPath), { recursive: true });
    await writeFile(linksPath, JSON.stringify(links, null, 2) + '\n', { mode: 0o600 });
    let version = 1;
    for (const status of states)
      await updateStatus(db, String(receipt.id), {
        expectedVersion: version++,
        status,
        ...(status === 'cancelled' ? { cancellationReason: 'Hủy đơn diễn tập hư cấu' } : {})
      });
    console.log(`Đã tạo: ${receipt.orderNumber} (${states.at(-1)}).`);
  }
  console.log('Link bí mật chỉ lưu trong tệp riêng; URL nhạc là placeholder, chưa kiểm tra NFC.');
} catch {
  console.error(
    'Không chuẩn bị được demo. Dừng API, kiểm tra migration và cấu hình DB; đơn đã tồn tại được giữ nguyên, không tự chạy lại trạng thái.'
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
