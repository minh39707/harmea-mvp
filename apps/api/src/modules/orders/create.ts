import { randomUUID } from 'node:crypto';
import type { Database } from '../../db.ts';
import { InputError } from '../../lib/errors.ts';
import { productSnapshot } from '../catalog/product.ts';
import { orderPayload } from './validation.ts';
import { parsePayload, validateParts, decodeFile, saveAsset, cleanup } from './uploads.ts';
import { addEvent } from './repository.ts';
import { lookupPhoneHash } from './lookup.ts';
import type { FileStorage } from '../../lib/storage/types.ts';

export async function createOrder(db: Database, storage: FileStorage, form: FormData) {
  const payload = orderPayload(parsePayload(form));
  validateParts(form, payload.items.length);
  if ((await db.query('SELECT id FROM orders WHERE request_key=?', [payload.requestKey])).rows[0])
    throw new InputError(
      'Đơn đã được ghi nhận. Tra cứu bằng mã đơn và số điện thoại.',
      'DUPLICATE_REQUEST',
      409
    );
  const created: string[] = [];
  try {
    const items: Array<
      ReturnType<typeof orderPayload>['items'][number] & {
        id: string;
        photoKey: string;
        previewKey: string;
      }
    > = [];
    for (const [i, item] of payload.items.entries()) {
      const photo = await decodeFile(
        form.get(`photo_${i}`),
        'photo',
        item.design.photoWidth && item.design.photoHeight
          ? { width: item.design.photoWidth, height: item.design.photoHeight }
          : undefined
      );
      const preview = await decodeFile(form.get(`preview_${i}`), 'preview');
      items.push({
        ...item,
        id: randomUUID(),
        photoKey: await saveAsset(storage, photo, created),
        previewKey: await saveAsset(storage, preview, created)
      });
    }
    const result = await db.transaction(async tx => {
      const product = (
        await tx.query('SELECT * FROM products WHERE id=? FOR SHARE', [items[0]!.productId])
      ).rows[0];
      if (!product || items.some(i => i.productId !== product.id))
        throw new InputError('Sản phẩm hoặc mẫu đã thay đổi.', 'PRODUCT_CHANGED', 409);
      if (!Boolean(product.is_active))
        throw new InputError('Sản phẩm đang tạm ngừng nhận đơn.', 'PRODUCT_INACTIVE', 409);
      if (items.some(i => i.templateVersion !== product.template_version))
        throw new InputError('Sản phẩm hoặc mẫu đã thay đổi.', 'PRODUCT_CHANGED', 409);
      const snapshot = productSnapshot(product);
      const quantity = items.reduce((n, i) => n + i.quantity, 0);
      const subtotal = quantity * snapshot.unitPriceVnd;
      const id = randomUUID(),
        number = `HM-${id.replaceAll('-', '').slice(0, 16).toUpperCase()}`;
      await tx.query(
        'INSERT INTO orders(id,order_number,request_key,product_id,product_snapshot,recipient_snapshot,lookup_phone_hash,quantity,unit_price_vnd,subtotal_vnd,customer_note) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        [
          id,
          number,
          payload.requestKey,
          product.id,
          JSON.stringify(snapshot),
          JSON.stringify(payload.recipient),
          lookupPhoneHash(payload.recipient.phone),
          quantity,
          snapshot.unitPriceVnd,
          subtotal,
          payload.note
        ]
      );
      const inserted = await tx.query('SELECT * FROM orders WHERE id=?', [id]);
      // MySQL's JSON text parser can round doubles. SQL DOUBLE casts keep the
      // submitted crop values exact, including very small normalized coordinates.
      for (const [position, item] of items.entries())
        await tx.query(
          `INSERT INTO order_items(id,order_id,position,design_snapshot,quantity,photo_key,preview_key)
           VALUES(?,?,?,JSON_SET(?, '$.crop.x', CAST(? AS DOUBLE), '$.crop.y', CAST(? AS DOUBLE),
             '$.crop.width', CAST(? AS DOUBLE), '$.crop.height', CAST(? AS DOUBLE)),?,?,?)`,
          [
            item.id,
            id,
            position,
            JSON.stringify(item.design),
            String(item.design.crop.x),
            String(item.design.crop.y),
            String(item.design.crop.width),
            String(item.design.crop.height),
            item.quantity,
            item.photoKey,
            item.previewKey
          ]
        );
      await addEvent(tx, randomUUID(), id, 1, null, 'pending', 'guest');
      return inserted.rows[0]!;
    });
    return {
      id: result.id,
      orderNumber: result.order_number,
      status: result.status,
      quantity: result.quantity,
      unitPriceVnd: result.unit_price_vnd,
      subtotalVnd: result.subtotal_vnd,
      shippingFeeVnd: null,
      currency: 'VND',
      createdAt: result.created_at
    };
  } catch (error) {
    await cleanup(storage, created).catch(() => {
      process.stderr.write(
        `${JSON.stringify({ level: 'error', event: 'order_asset_cleanup_failed' })}\n`
      );
    });
    if (
      (error as { code?: string; errno?: number; message?: string }).code === 'ER_DUP_ENTRY' &&
      (error as { errno?: number }).errno === 1062 &&
      (error as { message?: string }).message?.includes('request_key')
    )
      throw new InputError(
        'Đơn đã được ghi nhận. Tra cứu bằng mã đơn và số điện thoại.',
        'DUPLICATE_REQUEST',
        409
      );
    throw error;
  }
}
